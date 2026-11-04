import re
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from app.models.plan import Plan

TEMPLATE_DIR = Path(__file__).resolve().parents[1] / "templates"

_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=False,
)
_template = _env.get_template("plan.md.j2")


def render_plan_markdown(plan: Plan) -> str:
    return _template.render(
        content=plan.content_json or {},
        plan=plan,
    )


def markdown_filename(plan: Plan) -> str:
    theme = re.sub(r'[\\/:*?"<>|]', "_", plan.theme).strip() or "活动方案"
    return f"活动智囊_{theme}_{plan.starts_at:%Y-%m-%d}.md"