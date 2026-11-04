import json
import time
from pathlib import Path

from app.agent.base import AgentAdapter, AgentRequest, AgentResult

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "plan_welcome_party.json"


def load_mock_content() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


class MockAdapter(AgentAdapter):
    async def generate(self, request: AgentRequest) -> AgentResult:
        started = time.perf_counter()
        content = load_mock_content()
        return AgentResult(
            content=content,
            provider="mock",
            model="mock-fixture",
            prompt_version=request.prompt_version,
            latency_ms=int((time.perf_counter() - started) * 1000),
            raw_text=None,
        )
