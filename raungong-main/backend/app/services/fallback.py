import copy

from app.agent.mock import load_mock_content
from app.models.plan import Plan


def build_fallback_content(plan: Plan, reason: str) -> dict:
    content = copy.deepcopy(load_mock_content())
    content.setdefault("warnings", [])
    content["warnings"].append(
        f"智能体调用失败，已使用规则模板降级生成。原因：{reason[:200]}"
    )
    content.setdefault("assumptions", [])
    content["assumptions"].append(
        "当前内容为规则模板降级结果，物资、人员和时间需人工复核。"
    )
    return content
