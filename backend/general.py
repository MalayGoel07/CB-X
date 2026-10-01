from dotenv import load_dotenv
from ollama import AsyncClient, ResponseError
from pydantic import BaseModel
from typing import List, Literal, Optional
import asyncio
import json
import re
import os

load_dotenv()

M_ROUTER = os.getenv("A1")
M_RESEARCH = os.getenv("A2")
M_WRITER = os.getenv("A3")
M_CODER = os.getenv("A4")
M_MATH = os.getenv("A5")
M_MERGER = os.getenv("A3")

client = AsyncClient(host="http://127.0.0.1:11434")
ollama_semaphore = asyncio.Semaphore(2)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class BaseWorker:
    def __init__(
        self,
        name: str,
        system_prompt: str,
        model: Optional[str],
        num_predict: int,
        temperature: float = 0.3,
        keep_alive: str = "2m",
        think: bool | str | None = False,
    ):
        self.name = name
        self.system_prompt = system_prompt
        self.model = model
        self.num_predict = num_predict
        self.temperature = temperature
        self.keep_alive = keep_alive
        self.think = think

    async def run(self, task: str, history: Optional[List[Message]] = None) -> str:
        if not self.model:
            raise ValueError(f"{self.name}: no model configured (check A1-A4 in .env)")

        messages = (
            [{"role": "system", "content": self.system_prompt}]
            + [m.model_dump() for m in (history or [])]
            + [{"role": "user", "content": task}]
        )
        async with ollama_semaphore:
            response = await client.chat(
                model=self.model,
                messages=messages,
                options={"temperature": self.temperature, "num_predict": self.num_predict},
                keep_alive=self.keep_alive,
                think=self.think,
            )
        message = response.get("message") or {}
        return message.get("content") or message.get("thinking") or ""


router_worker = BaseWorker(
    "Router",
    '''
    You are a task router. Given a user message, return ONLY a JSON array of the single most relevant worker.
        Workers:
        - "Researcher": factual questions, definitions, explanations, general knowledge.
        - "Writer": essays, summaries, creative writing, rewriting.
        - "Coder": code generation, debugging, programming questions.
        - "Maths": calculations, equations, math problems.

        Rules:
        - Default to ["Researcher"] when unsure.
        - NEVER return all four unless the task truly requires all four.
        - Reply ONLY with a JSON array. No explanation, No prose.

        Examples:
        Q: What are nouns? → ["Researcher"]
        Q: Write a poem about rain → ["Writer"]
        Q: Sort a list in Python → ["Coder"]
        Q: Solve 2x + 5 = 11 → ["Maths"]
        Q: Research and write a blog post on AI → ["Researcher", "Writer"]
    ''',
    M_ROUTER, 50, 0.1,
)
research_worker = BaseWorker("Researcher", "You are a factual analyst. Research and reason about the given topic thoroughly, Answer clearly in under 250 words. Finish every sentence.", M_RESEARCH, 786, 0.5)
writer_worker = BaseWorker("Writer", "You are a skilled writer. Produce clear, well-structured output based on provided context, Answer clearly in under 250 words. Finish every sentence.", M_WRITER, 786, 0.7)
coder_worker = BaseWorker("Coder", "You are an expert programmer. Write clean, correct, non-commented code, Answer clearly. Finish every sentence.", M_CODER, 1024, 0.3)
math_worker = BaseWorker("Maths", "You are an expert Maths Expert. Solve properly, cleanly and carefully. Reply only with proper answer structure, no extra wording ,Answer clearly in under 250 words. Finish every sentence.", M_MATH, 512, 0.1)
synth_worker = BaseWorker("Merger", "Merge specialist outputs into ONE clean, concise final answer. No headers. No repeated content. Plain prose only, Answer clearly in under 250 words. Finish every sentence.", M_MERGER, 1024, 0.5)

# Specialists only: the Merger is not routable.
WORKER_MAP = {
    "Researcher": research_worker,
    "Writer": writer_worker,
    "Coder": coder_worker,
    "Maths": math_worker,
}


def sse_event(data: str) -> str:
    normalized = data.replace("\r\n", "\n").replace("\r", "\n")
    return "".join(f"data: {line}\n" for line in normalized.split("\n")) + "\n"


def parse_router_output(raw: str) -> list:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    matches = re.findall(r'\[.*?\]', cleaned, re.DOTALL)
    for match in matches:
        try:
            parsed = json.loads(match)
            if parsed and all(isinstance(x, str) for x in parsed):
                return parsed
        except json.JSONDecodeError:
            continue
    raise ValueError("No valid string JSON array found")

# Merging only makes sense for prose; it would mangle code/math formatting.
MERGEABLE = {"Researcher", "Writer"}


async def orchestrate(message: str, history: List[Message]):
    try:
        yield sse_event("[Router] : Deciding which specialists to call...")
        route_raw = await router_worker.run(message, history)
        try:
            needed = list(dict.fromkeys(w for w in parse_router_output(route_raw) if w in WORKER_MAP))
            if not needed:
                raise ValueError("Empty after filtering")
        except ValueError:
            needed = ["Researcher"]

        yield sse_event(f"[Router] : Calling {needed}")
        results = await asyncio.gather(*[WORKER_MAP[w].run(message, history) for w in needed])

        worker_outputs = ""
        for name, output in zip(needed, results):
            yield sse_event(f"[{name}] {output}")
            worker_outputs += f"### {name}:\n{output}\n\n"

        if len(needed) == 1:
            final = results[0]
        elif set(needed) <= MERGEABLE:
            yield sse_event("[Merger] : Merging outputs...")
            synth_input = f"User asked: {message}\n\nSpecialist outputs:\n{worker_outputs}"
            final = await synth_worker.run(synth_input)
        else:
            final = "\n\n".join(results)

        yield sse_event(f"[Final] {final}")
    except ConnectionError:
        yield sse_event("[Error] Can't reach Ollama. Start it (`ollama serve`) and try again.")
    except ResponseError as e:
        yield sse_event(f"[Error] Ollama rejected the request: {e.error} (is the model pulled?)")
    except Exception as e:
        yield sse_event(f"[Error] Unexpected server error: {e}")
    yield sse_event("[DONE]")