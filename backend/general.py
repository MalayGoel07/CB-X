from dotenv import load_dotenv
from ollama import AsyncClient, ResponseError
from pydantic import BaseModel, Field
from typing import AsyncIterator, List, Literal, Optional
import asyncio
import json
import re
import os
from pathlib import Path
from pypdf import PdfReader
from docx import Document
from io import BytesIO

load_dotenv()

M_ROUTER = os.getenv("A1")
M_RESEARCH = os.getenv("A2")
M_WRITER = os.getenv("A3")
M_CODER = os.getenv("A4")
M_MATH = os.getenv("A5")
M_MERGER = os.getenv("A3")
M_IMAGE = os.getenv("A6", M_RESEARCH)

client = AsyncClient(host="http://127.0.0.1:11434")
ollama_semaphore = asyncio.Semaphore(2)


class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str
    attachments: List[dict[str, str]] = Field(default_factory=list)
    token_count: Optional[int] = None


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

    def _build_messages(
        self,
        task: str,
        history: Optional[List[Message]],
        images: Optional[List[bytes]],
        system_prompt_suffix: Optional[str],
    ) -> list[dict]:
        system_prompt = self.system_prompt
        if system_prompt_suffix and system_prompt_suffix.strip():
            system_prompt = f"{system_prompt.rstrip()}\n\n{system_prompt_suffix.strip()}"
        return (
            [{"role": "system", "content": system_prompt}]
            + [m.model_dump(exclude={"attachments", "token_count"}) for m in (history or [])]
            + [{"role": "user", "content": task, **({"images": images} if images else {})}]
        )

    async def run(
        self,
        task: str,
        history: Optional[List[Message]] = None,
        images: Optional[List[bytes]] = None,
        system_prompt_suffix: Optional[str] = None,
    ) -> tuple[str, Optional[int]]:
        if not self.model:
            raise ValueError(f"{self.name}: no model configured (check A1-A4 in .env)")

        messages = self._build_messages(task, history, images, system_prompt_suffix)
        async with ollama_semaphore:
            response = await client.chat(
                model=self.model,
                messages=messages,
                options={"temperature": self.temperature, "num_predict": self.num_predict},
                keep_alive=self.keep_alive,
                think=self.think,
            )
        message = response.message
        return (
            message.content or message.thinking or "",
            response.eval_count,
        )

    async def stream(
        self,
        task: str,
        history: Optional[List[Message]] = None,
        images: Optional[List[bytes]] = None,
        system_prompt_suffix: Optional[str] = None,
    ) -> AsyncIterator[tuple[str, Optional[int]]]:
        if not self.model:
            raise ValueError(f"{self.name}: no model configured (check A1-A4 in .env)")

        messages = self._build_messages(task, history, images, system_prompt_suffix)
        async with ollama_semaphore:
            response_stream = await client.chat(
                model=self.model,
                messages=messages,
                options={"temperature": self.temperature, "num_predict": self.num_predict},
                keep_alive=self.keep_alive,
                think=self.think,
                stream=True,
            )
            async for response in response_stream:
                message = response.message
                yield message.content or message.thinking or "", response.eval_count


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
image_worker = BaseWorker(
    "ImageRed",
    """You are an expert multimodal image understanding assistant.
    Analyze the ENTIRE image, not just its main content.

    For screenshots containing code:
    1. Identify the title and topic.
    2. Transcribe the complete code accurately.
    3. Preserve indentation, comments, variable names and syntax.
    4. Explain what the code does.
    5. Describe the output shown in the image.
    6. Mention important visual details, labels and annotations.

    For other images, describe the objects, text, layout,
    relationships and relevant details.

    Never silently omit visible information.
    Clearly distinguish extracted text from your own explanation.""",
    M_IMAGE, 1024, 0.2
)
WORKER_MAP = {
    "Researcher": research_worker,
    "Writer": writer_worker,
    "Coder": coder_worker,
    "Maths": math_worker,
    "ImageRed": image_worker
}
async def read_image(
    image_path: str,
    question: str = "Describe the entire image. Extract all visible text accurately, preserve code formatting, identify the title, explain the content, and report any displayed output."
) -> str:
    if not Path(image_path).is_file():
        raise FileNotFoundError(image_path)

    async with ollama_semaphore:
        response = await client.chat(
            model=M_IMAGE,
            messages=[{
                "role": "user",
                "content": question,
                "images": [image_path]
            }],
            options={"temperature": 0.1, "num_predict": 1536},
            keep_alive="2m"
        )

    return response.message.content or ""

async def read_file(file_path: str) -> str:
    path = Path(file_path)

    if not path.is_file():
        raise FileNotFoundError(file_path)

    ext = path.suffix.lower()

    if ext == ".pdf":
        return "\n".join(
            page.extract_text() or ""
            for page in PdfReader(path).pages
        )

    if ext == ".docx":
        return "\n".join(
            paragraph.text for paragraph in Document(path).paragraphs
        )

    if ext in {".txt", ".md", ".py", ".js", ".json", ".csv", ".html", ".css"}:
        return path.read_text(encoding="utf-8")

    raise ValueError(f"Unsupported file type: {ext}")


def read_file_content(filename: str, content: bytes) -> str:
    ext = Path(filename).suffix.lower()

    if ext == ".pdf":
        return "\n".join(page.extract_text() or "" for page in PdfReader(BytesIO(content)).pages)

    if ext == ".docx":
        return "\n".join(paragraph.text for paragraph in Document(BytesIO(content)).paragraphs)

    if ext in {".txt", ".md", ".py", ".js", ".json", ".csv", ".html", ".css"}:
        return content.decode("utf-8")

    raise ValueError(f"Unsupported file type: {ext}")

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


async def orchestrate(
    message: str,
    history: List[Message],
    images: Optional[List[bytes]] = None,
    file_context: Optional[str] = None,
    system_prompt: Optional[str] = None,
):
    try:
        if file_context:
            message = f"{message}\n\nAttached file contents:\n{file_context}"

        if images:
            yield sse_event("[ImageRed] Analyzing attached image(s)...")
            image_analysis, _ = await image_worker.run(message, history, images)
            yield sse_event(f"[ImageRed] {image_analysis}")
            message = f"{message}\n\nImage analysis:\n{image_analysis}"

        yield sse_event("[Router] : Deciding which specialists to call...")
        route_raw, _ = await router_worker.run(
            message,
            history,
            system_prompt_suffix=system_prompt,
        )
        try:
            needed = list(dict.fromkeys(w for w in parse_router_output(route_raw) if w in WORKER_MAP))
            if not needed:
                raise ValueError("Empty after filtering")
        except ValueError:
            needed = ["Researcher"]

        yield sse_event(f"[Router] : Calling {needed}")
        if len(needed) == 1:
            worker = WORKER_MAP[needed[0]]
            yield sse_event(f"[{needed[0]}] Generating final answer...")
            final_token_count = None
            async for chunk, token_count in worker.stream(message, history):
                if chunk:
                    yield sse_event(f"[FinalChunk]{chunk}")
                if token_count is not None:
                    final_token_count = token_count
        elif set(needed) <= MERGEABLE:
            results = await asyncio.gather(*[WORKER_MAP[w].run(message, history) for w in needed])
            worker_outputs = ""
            for name, (output, _) in zip(needed, results):
                yield sse_event(f"[{name}] {output}")
                worker_outputs += f"### {name}:\n{output}\n\n"

            yield sse_event("[Merger] : Merging outputs...")
            synth_input = f"User asked: {message}\n\nSpecialist outputs:\n{worker_outputs}"
            final_token_count = None
            async for chunk, token_count in synth_worker.stream(synth_input):
                if chunk:
                    yield sse_event(f"[FinalChunk]{chunk}")
                if token_count is not None:
                    final_token_count = token_count
        else:
            result_token_counts = []
            for index, name in enumerate(needed):
                if index:
                    yield sse_event("[FinalChunk]\n\n")
                yield sse_event(f"[{name}] Generating response...")
                result_token_count = None
                async for chunk, token_count in WORKER_MAP[name].stream(message, history):
                    if chunk:
                        yield sse_event(f"[FinalChunk]{chunk}")
                    if token_count is not None:
                        result_token_count = token_count
                result_token_counts.append(result_token_count)
            final_token_count = (
                sum(count for count in result_token_counts if count is not None)
                if all(count is not None for count in result_token_counts)
                else None
            )

        if final_token_count is not None:
            yield sse_event(f"[Usage] {final_token_count}")
    except ConnectionError:
        yield sse_event("[Error] Can't reach Ollama. Start it (`ollama serve`) and try again.")
    except ResponseError as e:
        yield sse_event(f"[Error] Ollama rejected the request: {e.error} (is the model pulled?)")
    except Exception as e:
        yield sse_event(f"[Error] Unexpected server error: {e}")
    yield sse_event("[DONE]")