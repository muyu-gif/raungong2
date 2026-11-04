from typing import Any

from app.core.enums import activity_type_label
from app.models.plan import Plan
from app.models.user import utcnow


class ContentValidationError(ValueError):
    pass


REQUIRED_TOP = [
    "schema_version",
    "meta",
    "plan",
    "materials",
    "tasks",
    "promotion",
    "risks",
    "review",
    "assumptions",
    "warnings",
]

REQUIRED_PLAN = [
    "summary",
    "background",
    "objectives",
    "highlights",
    "success_criteria",
    "phases",
    "rundown",
    "budget",
]


def _number(value: Any, path: str) -> float:
    try:
        return round(float(value), 2)
    except (TypeError, ValueError) as exc:
        raise ContentValidationError(f"{path} 必须是数字") from exc


def _quantity(value: Any, path: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ContentValidationError(f"{path} 必须是整数") from exc


def _require_dict(value: Any, path: str) -> dict:
    if not isinstance(value, dict):
        raise ContentValidationError(f"{path} 必须是对象")
    return value


def _require_list(value: Any, path: str) -> list:
    if not isinstance(value, list):
        raise ContentValidationError(f"{path} 必须是数组")
    return value


def _normalize_budget(budget: dict, requested_yuan: float) -> None:
    items = _require_list(budget.get("items"), "plan.budget.items")
    items_total = 0.0

    for index, item in enumerate(items):
        item = _require_dict(item, f"plan.budget.items[{index}]")
        quantity = _quantity(item.get("quantity", 0), f"plan.budget.items[{index}].quantity")
        unit_price = _number(
            item.get("unit_price_yuan", 0),
            f"plan.budget.items[{index}].unit_price_yuan",
        )
        amount = round(quantity * unit_price, 2)
        item["quantity"] = quantity
        item["unit_price_yuan"] = unit_price
        item["amount_yuan"] = amount
        items_total += amount

    contingency = _number(
        budget.get("contingency_yuan", 0),
        "plan.budget.contingency_yuan",
    )
    budget["currency"] = "CNY"
    budget["requested_yuan"] = round(requested_yuan, 2)
    budget["items_total_yuan"] = round(items_total, 2)
    budget["contingency_yuan"] = contingency
    budget["planned_yuan"] = round(items_total + contingency, 2)


def _normalize_materials(materials: dict) -> None:
    items = _require_list(materials.get("items"), "materials.items")
    total_quantity = 0
    estimated = 0.0

    for index, item in enumerate(items):
        item = _require_dict(item, f"materials.items[{index}]")
        quantity = _quantity(item.get("quantity", 0), f"materials.items[{index}].quantity")
        unit_price = _number(
            item.get("unit_price_yuan", 0),
            f"materials.items[{index}].unit_price_yuan",
        )
        subtotal = round(quantity * unit_price, 2)
        item["quantity"] = quantity
        item["unit_price_yuan"] = unit_price
        item["subtotal_yuan"] = subtotal
        total_quantity += quantity
        estimated += subtotal

    materials["summary"] = {
        "total_items": len(items),
        "total_quantity": total_quantity,
        "estimated_cost_yuan": round(estimated, 2),
    }


def validate_and_normalize(
    content: dict[str, Any],
    plan: Plan,
    *,
    provider: str,
    degraded: bool = False,
) -> dict[str, Any]:
    content = _require_dict(content, "content")

    missing = [key for key in REQUIRED_TOP if key not in content]
    if missing:
        raise ContentValidationError(f"缺少顶层字段: {', '.join(missing)}")

    plan_data = _require_dict(content["plan"], "plan")
    missing_plan = [key for key in REQUIRED_PLAN if key not in plan_data]
    if missing_plan:
        raise ContentValidationError(f"缺少策划案字段: {', '.join(missing_plan)}")

    budget = _require_dict(plan_data["budget"], "plan.budget")
    _normalize_budget(budget, plan.budget_fen / 100)
    _normalize_materials(_require_dict(content["materials"], "materials"))

    tasks = _require_dict(content["tasks"], "tasks")
    risks = _require_dict(content["risks"], "risks")
    _require_list(tasks.get("items"), "tasks.items")
    _require_list(risks.get("items"), "risks.items")
    _require_dict(content["promotion"], "promotion")
    _require_dict(content["review"], "review")

    if not isinstance(content["assumptions"], list):
        content["assumptions"] = []
    if not isinstance(content["warnings"], list):
        content["warnings"] = []

    planned = budget["planned_yuan"]
    requested = round(plan.budget_fen / 100, 2)
    if planned > requested:
        content["warnings"].append(
            f"方案预计支出 {planned:.2f} 元，超出预算 {planned - requested:.2f} 元，请调整。"
        )

    content["schema_version"] = "1.0"
    content["meta"] = {
        "title": plan.title,
        "theme": plan.theme,
        "activity_type": plan.activity_type,
        "activity_type_label": activity_type_label(plan.activity_type),
        "participants": plan.participants,
        "budget_yuan": requested,
        "starts_at": plan.starts_at.isoformat(),
        "duration_minutes": plan.duration_minutes,
        "location": plan.location,
        "generated_at": utcnow().isoformat(),
        "agent": {
            "provider": provider,
            "prompt_version": "v1.0",
        },
        "degraded": degraded,
    }

    return content
