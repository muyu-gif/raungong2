from app.agent.base import AgentAdapter, AgentNotConfigured
from app.agent.dify import DifyAdapter
from app.agent.langgraph_agent import LangGraphAgent
from app.agent.mock import MockAdapter
from app.core.config import Settings


def build_agent(settings: Settings) -> AgentAdapter:
    if settings.agent_provider == "mock":
        return MockAdapter()

    if settings.agent_provider == "langgraph":
        if not settings.llm_api_key.get_secret_value():
            raise AgentNotConfigured("LangGraph 未配置 LLM_API_KEY")
        return LangGraphAgent(settings)

    if settings.agent_provider == "dify":
        api_key = settings.dify_api_key.get_secret_value()
        if not api_key:
            raise AgentNotConfigured("Dify 未配置 DIFY_API_KEY")
        return DifyAdapter(
            base_url=settings.dify_base_url,
            api_key=api_key,
            timeout=settings.agent_timeout_seconds,
        )

    raise AgentNotConfigured(f"未知的智能体平台: {settings.agent_provider}")
