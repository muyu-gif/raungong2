import json
import time

import httpx

from app.agent.base import AgentAdapter, AgentError, AgentRequest, AgentResult
from app.agent.parser import ContentParseError, extract_json


class DifyAdapter(AgentAdapter):
    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout: int = 120,
        transport: httpx.AsyncBaseTransport | None = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout
        self.transport = transport

    async def generate(self, request: AgentRequest) -> AgentResult:
        started = time.perf_counter()
        body = {
            "inputs": {
                "payload": json.dumps(request.payload, ensure_ascii=False),
                "instruction": request.instruction or "",
            },
            "response_mode": "blocking",
            "user": f"activity-mind-{request.request_id[:32]}",
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(
                timeout=self.timeout,
                transport=self.transport,
            ) as client:
                response = await client.post(
                    f"{self.base_url}/workflows/run",
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

        data = payload.get("data") or {}
        if data.get("status") != "succeeded":
            raise AgentError(
                "AGENT_UPSTREAM_ERROR",
                data.get("error") or "智能体工作流执行失败",
            )

        outputs = data.get("outputs") or {}
        content = outputs.get("content")
        if content is None:
            content = outputs.get("content_json")
        if content is None and isinstance(outputs, dict):
            # 兼容工作流直接把内容字段平铺到 outputs 的情况
            if "schema_version" in outputs:
                content = outputs

        if isinstance(content, str):
            try:
                content = extract_json(content)
            except ContentParseError as exc:
                raise AgentError("AGENT_OUTPUT_INVALID", str(exc)) from exc
        if not isinstance(content, dict):
            raise AgentError("AGENT_OUTPUT_INVALID", "智能体未返回结构化对象")

        return AgentResult(
            content=content,
            provider="dify",
            model=outputs.get("model"),
            prompt_version=request.prompt_version,
            latency_ms=int((time.perf_counter() - started) * 1000),
            tokens_in=int(data.get("total_tokens") or 0),
            tokens_out=0,
            raw_text=json.dumps(outputs, ensure_ascii=False)[:4000],
        )
