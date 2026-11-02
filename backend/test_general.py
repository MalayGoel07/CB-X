import asyncio
import sys
import types
from pathlib import Path

import httpx
import pytest

sys.path.insert(0, str(Path(__file__).parent))
sys.modules.setdefault("db", types.SimpleNamespace(save_file=lambda *args: "file"))

import general


def worker(provider="openai", key="secret", model="model"):
    general.api_keys.set({"common": {"key": key, "provider": provider}})
    return general.BaseWorker("Researcher", "system", model, 100, 0.2)


def test_google_key_is_header_only():
    url, headers, _ = worker("google")._api_request([{"role": "user", "content": "hi"}], True)
    assert "secret" not in url
    assert "key=" not in url
    assert headers["x-goog-api-key"] == "secret"
    assert "?alt=sse" in url


def test_empty_choices_stream_chunk_does_not_crash(monkeypatch):
    class StreamResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        async def aiter_lines(self):
            yield 'data: {"choices":[]}'
            yield 'data: {"choices":[{"delta":{"content":"ok"}}]}'

    class StreamContext:
        async def __aenter__(self):
            return StreamResponse()

        async def __aexit__(self, *args):
            return False

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        def stream(self, *args, **kwargs):
            return StreamContext()

    monkeypatch.setattr(general.httpx, "AsyncClient", Client)
    chunks = asyncio.run(collect(worker()._api_stream([{"role": "user", "content": "hi"}])))
    assert chunks == [("ok", None)]


async def collect(generator):
    return [chunk async for chunk in generator]


def test_no_key_without_local_ollama_raises(monkeypatch):
    monkeypatch.setattr(general, "LOCAL_OLLAMA", False)
    general.api_keys.set({})
    with pytest.raises(ValueError, match="Add your API key in Settings"):
        asyncio.run(worker(key=None).run("hi"))


def test_openai_image_is_base64_encoded():
    _, _, payload = worker()._api_request(
        [{"role": "user", "content": "look", "images": [b"\x89PNG\r\n\x1a\nabc"]}],
        False,
    )
    content = payload["messages"][0]["content"]
    assert content[1]["image_url"]["url"] == "data:image/png;base64,iVBORw0KGgphYmM="
    assert "images" not in payload["messages"][0]


def test_openrouter_free_model_passes_through():
    w = worker("openrouter", model="meta-llama/llama-3.3-70b:free")
    _, _, payload = w._api_request([{"role": "user", "content": "hi"}], False)
    assert payload["model"] == "meta-llama/llama-3.3-70b:free"


def test_api_key_allows_provider_default_without_configured_model():
    w = worker("openai", model=None)
    _, _, payload = w._api_request(w._messages("hi", None, None, None), False)
    assert payload["model"] == "gpt-4o-mini"


def test_router_timeout_falls_back_to_researcher(monkeypatch):
    async def slow_router(*args, **kwargs):
        await asyncio.sleep(0.01)
        raise asyncio.TimeoutError

    monkeypatch.setattr(general, "ROUTER_TIMEOUT", 0)
    monkeypatch.setattr(general.router_worker, "run", slow_router)
    events = asyncio.run(collect(general.orchestrate("hi", [], owner="test")))
    assert any("continuing with Researcher" in event for event in events)


def test_head_tail_fallback_without_embeddings(monkeypatch):
    monkeypatch.setattr(general, "LOCAL_OLLAMA", False)
    general.api_keys.set({"common": {"key": "secret", "provider": "anthropic"}})
    text = "\n\n".join(f"chunk-{i}-" + ("x" * 900) for i in range(10))
    result = asyncio.run(general.select_relevant(text, "question", 40))
    assert "chunk-0" in result
    assert "chunk-9" in result
    assert "[...]" in result
