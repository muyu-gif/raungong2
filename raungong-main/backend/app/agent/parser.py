import json
import re
from typing import Any


class ContentParseError(ValueError):
    pass


_FENCE_RE = re.compile(r"^```(?:json)?\s*(.*?)\s*```$", re.S)


def extract_json(text: str) -> dict[str, Any]:
    if not text or not text.strip():
        raise ContentParseError("智能体返回空内容")

    value = text.strip()
    fenced = _FENCE_RE.match(value)
    if fenced:
        value = fenced.group(1).strip()

    start = value.find("{")
    end = value.rfind("}")
    if start == -1 or end <= start:
        raise ContentParseError("智能体返回内容中没有 JSON 对象")

    candidate = value[start : end + 1]
    try:
        data = json.loads(candidate)
    except json.JSONDecodeError:
        # 常见模型输出问题：中文引号、尾逗号
        candidate = candidate.replace("“", '"').replace("”", '"')
        candidate = re.sub(r",\s*([}\]])", r"\1", candidate)
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError as exc:
            raise ContentParseError(f"JSON 解析失败: {exc}") from exc

    if not isinstance(data, dict):
        raise ContentParseError("JSON 根节点必须是对象")
    return data
