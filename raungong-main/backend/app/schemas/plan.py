from datetime import datetime

from pydantic import BaseModel, Field


class GeneratePlanRequest(BaseModel):
    theme: str = Field(min_length=2, max_length=60)
    activity_type: str = Field(min_length=2, max_length=32)
    participants: int = Field(ge=10, le=2000)
    budget_yuan: float = Field(ge=0, le=1_000_000)

    starts_at: datetime
    duration_minutes: int = Field(default=120, ge=30, le=480)
    location: str = Field(min_length=1, max_length=120)

    target_audience: str | None = Field(default=None, max_length=120)
    goals: list[str] = Field(default_factory=list, max_length=5)
    constraints: str | None = Field(default=None, max_length=500)
    tone: str = "lively"
    extra_notes: str | None = Field(default=None, max_length=500)


class GenerateAccepted(BaseModel):
    task_id: str
    plan_id: str
    status: str = "queued"
    reused: bool = False
    estimated_seconds: int = 3
    poll_after_ms: int = 1000
    poll_url: str

class SectionUpdateRequest(BaseModel):
    version: int = Field(ge=1)
    data: dict
    comment: str | None = Field(default=None, max_length=200)


class DuplicatePlanRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
