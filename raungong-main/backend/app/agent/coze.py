import json
import time

import httpx

from app.agent.base import AgentAdapter, AgentError, AgentRequest, AgentResult
from app.agent.parser import ContentParseError, extract_json


class CozeAdapter(AgentAdapter):
    def __init__(
        self,
        base_url: str,
        api_key: str,
        workflow_id: str,
        timeout: int = 120,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.workflow_id = workflow_id
        self.timeout = timeout
        self.transport = transport

    async def generate(self, request: AgentRequest) -> AgentResult:
        started = time.perf_counter()
        headers = {"Authorization": f"Bearer {self.api_key}"}
        body = {
            "workflow_id": self.workflow_id,
            "parameters": {
                "payload": json.dumps(request.payload, ensure_ascii=False),
                "instruction": request.instruction or "",
                "section_key": request.section_key or "",
            },
        }

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                transport=self.transport,
            ) as client:
                response = await client.post(
                    f"{self.base_url}/v1/workflow/run",
                    json=body,
                    headers=headers,
                )
        except httpx.TimeoutException as exc:
            raise AgentError("AGENT_TIMEOUT", "智能体响应超时，请稍后重试") from exc
        except httpx.HTTPError as exc:
            raise AgentError("AGENT_UPSTREAM_ERROR", "智能体服务连接失败") from exc

        if response.status_code >= 400:
            retryable = response.status_code == 429 or response.status_code >= 500
            raise AgentError(
                "AGENT_UPSTREAM_ERROR",
                f"智能体服务返回 {response.status_code}",
                retryable=retryable,
            )

        try:
            payload = response.json()
        except ValueError as exc:
            raise AgentError("AGENT_OUTPUT_INVALID", "智能体返回非 JSON 响应") from exc

        if payload.get("code") not in (0, None):
            raise AgentError(
                "AGENT_UPSTREAM_ERROR",
                payload.get("msg") or "扣子工作流执行失败",
            )

        output = (payload.get("data") or {}).get("output")
        if isinstance(output, str):
            try:
                output = extract_json(output)
            except ContentParseError as exc:
                raise AgentError("AGENT_OUTPUT_INVALID", str(exc)) from exc
        if not isinstance(output, dict):
            raise AgentError("AGENT_OUTPUT_INVALID", "智能体未返回结构化对象")

        return AgentResult(
            content=output,
            provider="coze",
            model=None,
            prompt_version=request.prompt_version,
            latency_ms=int((time.perf_counter() - started) * 1000),
            raw_text=json.dumps(payload, ensure_ascii=False)[:4000],
        )
