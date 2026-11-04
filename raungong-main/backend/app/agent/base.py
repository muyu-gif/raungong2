from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass
class AgentRequest:
    request_id: str
    payload: dict[str, Any]
    instruction: str | None = None
    section_key: str | None = None
    prompt_version: str = "v1.0"


@dataclass
class AgentResult:
    content: dict[str, Any]
    provider: str
    model: str | None = None
    prompt_version: str = "v1.0"
    latency_ms: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    raw_text: str | None = None
    meta: dict[str, Any] = field(default_factory=dict)


class AgentError(Exception):
    def __init__(self, code: str, message: str, retryable: bool = True):
        super().__init__(message)
        self.code = code
        self.message = message
        self.retryable = retryable


class AgentNotConfigured(AgentError):
    def __init__(self, message: str = "智能体未配置"):
        super().__init__("AGENT_NOT_CONFIGURED", message, retryable=False)


class AgentAdapter(Protocol):
    async def generate(self, request: AgentRequest) -> AgentResult:
        ...
