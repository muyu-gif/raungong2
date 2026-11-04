# 活动智囊后端

基于 FastAPI 的校园社团活动策划与执行包生成服务，智能体默认走 LangGraph + DeepSeek（`AGENT_PROVIDER=langgraph`）。

## 本地启动

最简单的方式（端口已固定为 **8082**）：

```powershell
cd D:\ruangong2\raungong-main\backend
.\start.ps1
```

等价的手动命令：

```powershell
cd D:\ruangong2\raungong-main\backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8082
```

首次启动需等 10~20 秒（加载 LangChain），看到 `Application startup complete` 即就绪。

重建环境（换机器或 `.venv` 损坏时）：

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
copy .env.example .env    # 然后填入 LLM_API_KEY
```

> 不要直接拷贝别人的 `.venv` 目录：`pyvenv.cfg` 里写死了创建者的 Python 路径，换机器必定失效。

## 接口文档

- Swagger UI：http://127.0.0.1:8082/docs
- 健康检查：http://127.0.0.1:8082/healthz
- 前端开发服务需把 `.env.development` 的 `VITE_API_BASE_URL` 指向 `http://127.0.0.1:8082`

## 目录结构

```text
backend/
├── app/
│   ├── main.py
│   ├── core/          # 配置、安全、枚举
│   ├── api/           # 路由与依赖
│   ├── models/        # SQLAlchemy 模型
│   ├── schemas/       # Pydantic 入参
│   ├── services/      # 生成编排、内容校验、降级、导出
│   └── agent/         # 适配器：langgraph / dify / coze / mock
├── knowledge/         # BM25 RAG 知识库
├── data/              # SQLite 数据文件
├── start.ps1          # 启动脚本（8082）
├── requirements.txt
└── .env.example
```
