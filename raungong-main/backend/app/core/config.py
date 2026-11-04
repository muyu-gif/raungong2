from functools import lru_cache
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "活动智囊 API"
    app_env: str = "dev"
    database_url: str = "sqlite+aiosqlite:///./data/app.db"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    agent_provider: Literal["mock", "dify", "coze", "langgraph"] = "mock"
    agent_timeout_seconds: int = 120
    agent_max_retries: int = 1
    enable_fallback: bool = True

    llm_base_url: str = "https://api.deepseek.com/v1"
    llm_api_key: SecretStr = SecretStr("")
    llm_model: str = "deepseek-chat"

    rag_top_k: int = 4
    rag_knowledge_dir: str = "./knowledge"

    dify_base_url: str = "https://api.dify.ai/v1"
    dify_api_key: SecretStr = SecretStr("")

    coze_base_url: str = "https://api.coze.cn"
    coze_api_key: SecretStr = SecretStr("")
    coze_workflow_id: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [item.strip() for item in self.cors_origins.split(",") if item.strip()]

    @property
    def agent_configured(self) -> bool:
        if self.agent_provider == "mock":
            return True
        if self.agent_provider == "langgraph":
            return bool(self.llm_api_key.get_secret_value())
        if self.agent_provider == "dify":
            return bool(self.dify_api_key.get_secret_value())
        return bool(self.coze_api_key.get_secret_value() and self.coze_workflow_id)


@lru_cache
def get_settings() -> Settings:
    return Settings()
