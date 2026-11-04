import asyncio

from app.agent.base import AgentError, AgentRequest
from app.agent.factory import build_agent
from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models.plan import Plan
from app.models.task import GenerationTask
from app.models.user import utcnow
from app.services.content_validator import ContentValidationError, validate_and_normalize
from app.services.fallback import build_fallback_content


async def run_generation(task_id: str) -> None:
    settings = get_settings()

    async with SessionLocal() as db:
        task = await db.get(GenerationTask, task_id)
        if task is None:
            return

        plan = await db.get(Plan, task.plan_id)
        if plan is None:
            task.status = "failed"
            task.error_code = "PLAN_NOT_FOUND"
            task.error_message = "方案不存在"
            task.finished_at = utcnow()
            await db.commit()
            return

        task.status = "running"
        task.stage = "planning"
        task.progress = 20
        task.attempt = 1
        task.started_at = task.started_at or utcnow()
        plan.status = "generating"
        await db.commit()

        result = None
        last_error: Exception | None = None

        try:
            agent = None
            try:
                agent = build_agent(settings)
            except AgentError as exc:
                last_error = exc

            if agent is not None:
                request = AgentRequest(
                    request_id=task.id,
                    payload=plan.input_json,
                    instruction=task.instruction,
                    section_key=task.section_key,
                )

                for attempt in range(settings.agent_max_retries + 1):
                    task.attempt = attempt + 1
                    try:
                        result = await agent.generate(request)
                        break
                    except (AgentError, ContentValidationError) as exc:
                        last_error = exc
                        retryable = getattr(exc, "retryable", True)
                        if not retryable or attempt >= settings.agent_max_retries:
                            break
                        task.stage = "retrying"
                        task.error_code = getattr(exc, "code", "AGENT_ERROR")
                        task.error_message = str(exc)[:500]
                        await db.commit()
                        await asyncio.sleep(1)

            task.stage = "validating"
            task.progress = 90
            await db.commit()

            degraded = result is None
            if result is None:
                if not settings.enable_fallback:
                    raise last_error or AgentError(
                        "AGENT_FAILED",
                        "智能体生成失败",
                    )
                content = build_fallback_content(
                    plan,
                    str(last_error) if last_error else "unknown error",
                )
                content = validate_and_normalize(
                    content,
                    plan,
                    provider="fallback",
                    degraded=True,
                )
            else:
                content = validate_and_normalize(
                    result.content,
                    plan,
                    provider=result.provider,
                )

            task.stage = "saving"
            task.progress = 98
            plan.content_json = content
            plan.summary = content["plan"]["summary"][:300]
            plan.status = "ready"
            plan.degraded = degraded
            plan.updated_at = utcnow()

            task.status = "succeeded"
            task.stage = "done"
            task.progress = 100
            task.error_code = None
            task.error_message = None
            task.finished_at = utcnow()
            await db.commit()

        except Exception as exc:
            await db.rollback()
            task = await db.get(GenerationTask, task_id)
            if task is None:
                return

            task.status = "failed"
            task.error_code = getattr(exc, "code", "GENERATION_FAILED")
            task.error_message = str(exc)[:500]
            task.finished_at = utcnow()

            plan = await db.get(Plan, task.plan_id)
            if plan is not None:
                plan.status = "failed"
                plan.updated_at = utcnow()
            await db.commit()
