import json
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph

from app.agent.base import AgentAdapter, AgentError, AgentRequest, AgentResult
from app.agent.parser import ContentParseError, extract_json
from app.agent.rag import RagStore
from app.core.config import Settings


class GraphState(TypedDict):
    activity: dict[str, Any]
    context: str
    plan: dict[str, Any]
    materials: dict[str, Any]
    tasks: dict[str, Any]
    promotion: dict[str, Any]
    risks: dict[str, Any]
    review: dict[str, Any]


PLAN_PROMPT = """你是校园活动策划专家。根据活动参数和知识库，生成策划案。
只输出 JSON 对象：{"plan": {...}}。
plan 必须包含：
summary, background, objectives[], highlights[], success_criteria[],
phases[{id,name,start_date,end_date,goal,key_actions[],owner,deliverables[]}],
rundown[{seq,start_time,end_time,duration_minutes,segment,content,owner,location,notes}],
budget{currency:"CNY",requested_yuan,items_total_yuan,contingency_yuan,planned_yuan,
items[{id,category,name,unit,quantity,unit_price_yuan,amount_yuan,note}],
funding_sources[{name,amount_yuan}]}。
金额单位元，保留两位小数，预算不得超过活动预算。"""

EXEC_PROMPT = """你是校园活动执行专家。根据活动参数、策划案和知识库，生成物资清单和分工表。
只输出 JSON 对象：{"materials": {...}, "tasks": {...}}。
materials 必须包含 items[{id,category,name,spec,unit,quantity,unit_price_yuan,subtotal_yuan,
purchase_channel,owner,needed_by,status,note}] 和 summary{total_items,total_quantity,estimated_cost_yuan}。
tasks 必须包含 items[{id,phase,name,role,owner,collaborators[],start_at,due_at,priority,
depends_on[],acceptance,notes}] 和 summary{total,by_priority{high,medium,low}}。
时间使用 ISO 8601，金额单位元。"""

PROMO_PROMPT = """你是校园活动宣传与风险专家。根据活动参数、策划案、物资和分工，生成宣传文案、风险清单和复盘模板。
只输出 JSON 对象：{"promotion": {...}, "risks": {...}, "review": {...}}。
promotion 必须包含 slogan,key_messages[],copy{title,body,hashtags[],call_to_action},
channels[{channel,content,publish_at,owner}],poster_copy{headline,subheadline,footer}。
risks 必须包含 items[{id,category,description,level,probability,impact,trigger,mitigation,
contingency,owner}] 和 summary{total,high,medium,low}，至少 6 条。
review 必须包含 kpis[{name,target,method}],retro_questions[],checklist[],template_markdown。"""


class LangGraphAgent(AgentAdapter):
    def __init__(self, settings: Settings, llm: Any | None = None):
        self.settings = settings
        self.llm = llm or ChatOpenAI(
            model=settings.llm_model,
            api_key=settings.llm_api_key.get_secret_value(),
            base_url=settings.llm_base_url,
            temperature=0.3,
            timeout=settings.agent_timeout_seconds,
            max_retries=0,
        )
        self.rag = RagStore(settings.rag_knowledge_dir)
        self.graph = self._build_graph()

    def _build_graph(self):
        graph = StateGraph(GraphState)
        graph.add_node("plan", self._plan_node)
        graph.add_node("execution", self._execution_node)
        graph.add_node("promotion", self._promotion_node)
        graph.add_edge(START, "plan")
        graph.add_edge("plan", "execution")
        graph.add_edge("execution", "promotion")
        graph.add_edge("promotion", END)
        return graph.compile()

    async def _ask(self, system: str, user: str) -> dict[str, Any]:
        try:
            response = await self.llm.ainvoke(
                [SystemMessage(content=system), HumanMessage(content=user)]
            )
        except Exception as exc:
            raise AgentError("AGENT_UPSTREAM_ERROR", f"DeepSeek 调用失败: {exc}") from exc

        text = response.content
        if not isinstance(text, str):
            text = json.dumps(text, ensure_ascii=False)
        try:
            return extract_json(text)
        except ContentParseError as exc:
            raise AgentError("AGENT_OUTPUT_INVALID", str(exc)) from exc

    def _input_text(self, state: GraphState) -> str:
        return (
            f"活动参数：{json.dumps(state['activity'], ensure_ascii=False)}\n"
            f"知识库：\n{state['context']}"
        )

    async def _plan_node(self, state: GraphState) -> dict[str, Any]:
        data = await self._ask(PLAN_PROMPT, self._input_text(state))
        if not isinstance(data.get("plan"), dict):
            raise AgentError("AGENT_OUTPUT_INVALID", "缺少 plan")
        return {"plan": data["plan"]}

    async def _execution_node(self, state: GraphState) -> dict[str, Any]:
        user = self._input_text(state) + "\n策划案：" + json.dumps(state["plan"], ensure_ascii=False)
        data = await self._ask(EXEC_PROMPT, user)
        if not isinstance(data.get("materials"), dict) or not isinstance(data.get("tasks"), dict):
            raise AgentError("AGENT_OUTPUT_INVALID", "缺少 materials/tasks")
        return {"materials": data["materials"], "tasks": data["tasks"]}

    async def _promotion_node(self, state: GraphState) -> dict[str, Any]:
        user = (
            self._input_text(state)
            + "\n策划案：" + json.dumps(state["plan"], ensure_ascii=False)
            + "\n物资：" + json.dumps(state["materials"], ensure_ascii=False)
            + "\n分工：" + json.dumps(state["tasks"], ensure_ascii=False)
        )
        data = await self._ask(PROMO_PROMPT, user)
        for key in ("promotion", "risks", "review"):
            if not isinstance(data.get(key), dict):
                raise AgentError("AGENT_OUTPUT_INVALID", f"缺少 {key}")
        return {
            "promotion": data["promotion"],
            "risks": data["risks"],
            "review": data["review"],
        }

    async def generate(self, request: AgentRequest) -> AgentResult:
        activity = request.payload
        query = f"{activity.get('theme', '')} {activity.get('activity_type', '')} 活动 预算 风险 分工 宣传"
        context = self.rag.search(query, self.settings.rag_top_k)

        initial: GraphState = {
            "activity": activity,
            "context": context,
            "plan": {},
            "materials": {},
            "tasks": {},
            "promotion": {},
            "risks": {},
            "review": {},
        }
        final = await self.graph.ainvoke(initial)

        content = {
            "schema_version": "1.0",
            "meta": {},
            "plan": final.get("plan") or {},
            "materials": final.get("materials") or {},
            "tasks": final.get("tasks") or {},
            "promotion": final.get("promotion") or {},
            "risks": final.get("risks") or {},
            "review": final.get("review") or {},
            "assumptions": [],
            "warnings": [],
        }
        return AgentResult(
            content=content,
            provider="langgraph",
            model=self.settings.llm_model,
            prompt_version=request.prompt_version,
        )
