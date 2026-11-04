import json
from typing import Any

SYSTEM_GUARD = """你是校园活动策划助手。只输出一个 JSON 对象，不要输出 Markdown 代码块、解释或前后缀。
JSON 必须符合 plan-content schema；金额单位为人民币元，保留两位小数。
不要编造不存在的场地、供应商或校方政策；不确定的信息写入 assumptions。"""


def build_user_payload(activity_input: dict[str, Any], instruction: str | None = None) -> str:
    return (
        "请根据以下活动参数生成活动执行包。\n"
        f"<activity_input>{json.dumps(activity_input, ensure_ascii=False)}</activity_input>\n"
        f"<extra_instruction>{instruction or '无'}</extra_instruction>\n"
        "再次强调：只输出 JSON 对象，不要输出其他内容。"
    )
