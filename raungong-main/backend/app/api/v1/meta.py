from fastapi import APIRouter

from app.core.enums import (
    ACTIVITY_TYPES,
    PLAN_STATUSES,
    RISK_LEVELS,
    SECTIONS,
    TASK_PRIORITIES,
    TASK_STATUSES,
    TONES,
)

router = APIRouter(prefix="/meta", tags=["Meta"])


def _items(values: list[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"value": value, "label": label} for value, label in values]


@router.get("/enums")
async def get_enums():
    return {
        "activity_types": _items(ACTIVITY_TYPES),
        "plan_statuses": _items(PLAN_STATUSES),
        "task_statuses": _items(TASK_STATUSES),
        "sections": _items(SECTIONS),
        "risk_levels": _items(RISK_LEVELS),
        "task_priorities": _items(TASK_PRIORITIES),
        "tones": _items(TONES),
    }
