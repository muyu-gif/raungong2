import copy
from urllib.parse import quote

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    Query,
    Response,
)
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.enums import activity_type_label
from app.db.session import get_db
from app.models.plan import Plan
from app.models.task import GenerationTask
from app.models.user import User, utcnow
from app.schemas.plan import (
    DuplicatePlanRequest,
    GenerateAccepted,
    GeneratePlanRequest,
    SectionUpdateRequest,
)
from app.services.export_service import markdown_filename, render_plan_markdown
from app.services.generation_service import run_generation

router = APIRouter(tags=["Generation"])


def _task_payload(task: GenerationTask) -> dict:
    if task.status == "succeeded":
        message = "生成完成"
    elif task.status == "failed":
        message = "生成失败"
    elif task.status == "running":
        message = "正在生成"
    else:
        message = "已排队"

    return {
        "task_id": task.id,
        "plan_id": task.plan_id,
        "type": task.type,
        "section_key": task.section_key,
        "status": task.status,
        "stage": task.stage,
        "progress": task.progress,
        "message": message,
        "attempt": task.attempt,
        "error": (
            {
                "code": task.error_code,
                "message": task.error_message,
                "retryable": task.error_code not in {"AGENT_NOT_CONFIGURED"},
            }
            if task.error_code
            else None
        ),
        "created_at": task.created_at,
        "started_at": task.started_at,
        "finished_at": task.finished_at,
    }


def _plan_summary(plan: Plan) -> dict:
    return {
        "id": plan.id,
        "title": plan.title,
        "theme": plan.theme,
        "activity_type": plan.activity_type,
        "activity_type_label": activity_type_label(plan.activity_type),
        "participants": plan.participants,
        "budget_yuan": plan.budget_fen / 100,
        "starts_at": plan.starts_at,
        "location": plan.location,
        "status": plan.status,
        "degraded": plan.degraded,
        "version": plan.version,
        "summary": plan.summary,
        "created_at": plan.created_at,
        "updated_at": plan.updated_at,
    }


def _plan_detail(plan: Plan, latest_task: dict | None = None) -> dict:
    data = _plan_summary(plan)
    data.update(
        {
            "input": plan.input_json,
            "content": plan.content_json,
            "latest_task": latest_task,
        }
    )
    return data


async def _get_latest_task(
    db: AsyncSession,
    plan_id: str,
    user_id: str,
) -> dict | None:
    task = await db.scalar(
        select(GenerationTask)
        .where(
            GenerationTask.plan_id == plan_id,
            GenerationTask.user_id == user_id,
        )
        .order_by(GenerationTask.created_at.desc())
        .limit(1)
    )
    return _task_payload(task) if task else None



@router.post(
    "/plans/generate",
    response_model=GenerateAccepted,
    status_code=202,
)
async def generate_plan(
    body: GeneratePlanRequest,
    background: BackgroundTasks,
    idempotency_key: str | None = Header(
        default=None,
        alias="Idempotency-Key",
    ),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if idempotency_key:
        existing = await db.scalar(
            select(GenerationTask).where(
                GenerationTask.idempotency_key == idempotency_key,
                GenerationTask.user_id == user.id,
            )
        )
        if existing:
            return GenerateAccepted(
                task_id=existing.id,
                plan_id=existing.plan_id,
                status=existing.status,
                reused=True,
                poll_url=f"/api/v1/tasks/{existing.id}",
            )

    plan = Plan(
        user_id=user.id,
        title=f"{body.theme}活动方案",
        status="generating",
        theme=body.theme,
        activity_type=body.activity_type,
        participants=body.participants,
        budget_fen=int(round(body.budget_yuan * 100)),
        starts_at=body.starts_at,
        duration_minutes=body.duration_minutes,
        location=body.location,
        input_json=body.model_dump(mode="json"),
    )
    db.add(plan)
    await db.flush()

    task = GenerationTask(
        plan_id=plan.id,
        user_id=user.id,
        status="queued",
        idempotency_key=idempotency_key,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    background.add_task(run_generation, task.id)

    return GenerateAccepted(
        task_id=task.id,
        plan_id=plan.id,
        poll_url=f"/api/v1/tasks/{task.id}",
    )


@router.get("/tasks/{task_id}")
async def get_task(
    task_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await db.scalar(
        select(GenerationTask).where(
            GenerationTask.id == task_id,
            GenerationTask.user_id == user.id,
        )
    )
    if task is None:
        raise HTTPException(status_code=404, detail="任务不存在")

    return _task_payload(task)


@router.get("/plans/{plan_id}")
async def get_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.user_id == user.id,
            Plan.deleted_at.is_(None),
        )
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="方案不存在")

    latest_task = await _get_latest_task(db, plan.id, user.id)
    return _plan_detail(plan, latest_task)

@router.get("/plans")
async def list_plans(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    keyword: str | None = Query(default=None, max_length=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [
        Plan.user_id == user.id,
        Plan.deleted_at.is_(None),
    ]

    if keyword:
        like = f"%{keyword}%"
        filters.append(
            or_(
                Plan.title.ilike(like),
                Plan.theme.ilike(like),
            )
        )

    total = await db.scalar(
        select(func.count()).select_from(Plan).where(*filters)
    ) or 0

    rows = (
        await db.scalars(
            select(Plan)
            .where(*filters)
            .order_by(Plan.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items = [_plan_summary(plan) for plan in rows]

    total_pages = (total + page_size - 1) // page_size if total else 0

    return {
        "items": items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
            "has_more": page < total_pages,
        },
    }


SECTION_KEYS = {"plan", "materials", "tasks", "promotion", "risks", "review"}


def _recalculate_section(section_key: str, data: dict) -> dict:
    if section_key == "materials":
        items = data.get("items", [])
        total_quantity = 0
        estimated = 0.0

        for item in items:
            quantity = int(item.get("quantity", 0))
            price = float(item.get("unit_price_yuan", 0))
            subtotal = round(price * quantity, 2)
            item["subtotal_yuan"] = subtotal
            total_quantity += quantity
            estimated += subtotal

        data["summary"] = {
            "total_items": len(items),
            "total_quantity": total_quantity,
            "estimated_cost_yuan": round(estimated, 2),
        }

    elif section_key == "plan":
        budget = data.get("budget", {})
        items = budget.get("items", [])
        items_total = 0.0

        for item in items:
            quantity = int(item.get("quantity", 0))
            price = float(item.get("unit_price_yuan", 0))
            amount = round(price * quantity, 2)
            item["amount_yuan"] = amount
            items_total += amount

        contingency = float(budget.get("contingency_yuan", 0))
        budget["items_total_yuan"] = round(items_total, 2)
        budget["planned_yuan"] = round(items_total + contingency, 2)
        data["budget"] = budget

    return data


@router.patch("/plans/{plan_id}/sections/{section_key}")
async def update_section(
    plan_id: str,
    section_key: str,
    body: SectionUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if section_key not in SECTION_KEYS:
        raise HTTPException(status_code=400, detail="不支持的 section_key")

    plan = await db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.user_id == user.id,
            Plan.deleted_at.is_(None),
        )
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="方案不存在")

    if plan.status != "ready":
        raise HTTPException(status_code=409, detail="方案尚未生成完成")

    if body.version != plan.version:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "VERSION_CONFLICT",
                "message": "方案已被其他页面修改，请刷新后重试",
                "current_version": plan.version,
            },
        )

    content = dict(plan.content_json or {})
    data = _recalculate_section(section_key, dict(body.data))
    content[section_key] = data

    plan.content_json = content
    plan.version += 1
    plan.updated_at = utcnow()

    await db.commit()
    await db.refresh(plan)

    return {
        "plan_id": plan.id,
        "section_key": section_key,
        "version": plan.version,
        "data": data,
        "updated_at": plan.updated_at,
    }

@router.get("/plans/{plan_id}/export")
async def export_plan(
    plan_id: str,
    format: str = Query(default="markdown"),
    inline: bool = Query(default=False),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if format not in {"markdown", "md"}:
        raise HTTPException(status_code=400, detail="目前只支持 markdown")

    plan = await db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.user_id == user.id,
            Plan.deleted_at.is_(None),
        )
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="方案不存在")

    if plan.status != "ready" or not plan.content_json:
        raise HTTPException(status_code=409, detail="方案尚未生成完成")

    markdown = render_plan_markdown(plan)
    filename = markdown_filename(plan)
    disposition = "inline" if inline else "attachment"

    headers = {
        "Content-Disposition": (
            f"{disposition}; filename=\"activity-mind-plan.md\"; "
            f"filename*=UTF-8''{quote(filename)}"
        )
    }

    return Response(
        content=markdown,
        media_type="text/markdown; charset=utf-8",
        headers=headers,
    )


@router.delete("/plans/{plan_id}", status_code=204)
async def delete_plan(
    plan_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.user_id == user.id,
            Plan.deleted_at.is_(None),
        )
    )
    if plan is None:
        raise HTTPException(status_code=404, detail="方案不存在")

    plan.deleted_at = utcnow()
    plan.updated_at = utcnow()
    await db.commit()
    return Response(status_code=204)


@router.post("/plans/{plan_id}/duplicate", status_code=201)
async def duplicate_plan(
    plan_id: str,
    body: DuplicatePlanRequest | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    source = await db.scalar(
        select(Plan).where(
            Plan.id == plan_id,
            Plan.user_id == user.id,
            Plan.deleted_at.is_(None),
        )
    )
    if source is None:
        raise HTTPException(status_code=404, detail="方案不存在")

    title = (body.title if body and body.title else f"{source.title}（副本）")[:120]

    plan = Plan(
        user_id=user.id,
        title=title,
        status="ready" if source.content_json else "draft",
        theme=source.theme,
        activity_type=source.activity_type,
        participants=source.participants,
        budget_fen=source.budget_fen,
        starts_at=source.starts_at,
        duration_minutes=source.duration_minutes,
        location=source.location,
        input_json=copy.deepcopy(source.input_json),
        content_json=copy.deepcopy(source.content_json),
        summary=source.summary,
        degraded=source.degraded,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return _plan_detail(plan, None)
