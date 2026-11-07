# 活动智囊 · 校园活动智能策划平台

面向校园活动的智能策划工作台。填写主题、人数、预算与日期后，自动生成包含策划案、预算、物资、分工、宣传、风险与复盘的完整活动方案，并支持按节编辑、复制、删除和 Markdown 导出。

## 项目组成

- **前端**：Vue 3 + Vite + TypeScript + Pinia + Vue Router + Element Plus
- **后端**：FastAPI + SQLAlchemy Async + SQLite / PostgreSQL
- **智能体**：LangGraph 三节点工作流 + DeepSeek + BM25 RAG
- **鉴权**：JWT
- **导出**：Markdown（浏览器打印为 PDF）
- **Mock**：前端 `devmock/`，无后端也能演示

## 功能

- 注册、登录、JWT 鉴权
- 活动枚举字典
- 异步生成方案：202 + 任务轮询
- 六大部分：策划案、物资、分工、宣传、风险、复盘
- 按节编辑 + 乐观锁版本冲突
- 方案列表、关键词搜索、分页
- 复制方案、软删除方案
- Markdown 导出
- 智能体超时、重试 1 次、规则降级
- LangGraph + DeepSeek + BM25 RAG 真实生成

## 仓库结构

```text
.
├── src/                         # Vue 前端
├── devmock/                     # 前端 Mock 后端
├── raungong-main/
│   ├── backend/                 # FastAPI 后端
│   │   ├── app/
│   │   │   ├── agent/           # Mock / LangGraph / Dify 适配器
│   │   │   ├── api/v1/          # 路由
│   │   │   ├── services/        # 生成、校验、导出
│   │   │   └── ...
│   │   ├── knowledge/           # BM25 RAG 知识库
│   │   ├── requirements.txt
│   │   └── .env.example
│   ├── docs/                    # 需求、后端、接口、前端文档
│   ├── contracts/               # OpenAPI、JSON Schema、DDL
│   └── examples/                # 标准示例数据
└── README.md
```

## 快速开始

### 1. 启动后端

```powershell
cd raungong-main/backend

python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt

Copy-Item .env.example .env
```

编辑 `.env`：

```env
AGENT_PROVIDER=langgraph

LLM_BASE_URL=https://api.deepseek.com/v1
LLM_API_KEY=sk-你的Key
LLM_MODEL=deepseek-chat

RAG_TOP_K=4
RAG_KNOWLEDGE_DIR=./knowledge

AGENT_TIMEOUT_SECONDS=120
AGENT_MAX_RETRIES=1
ENABLE_FALLBACK=true
```

启动：

```powershell
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

- Swagger：<http://127.0.0.1:8000/docs>
- 健康检查：<http://127.0.0.1:8000/healthz>

看到：

```json
{
  "agent": {
    "provider": "langgraph",
    "configured": true
  }
}
```

说明真实智能体已启用。

### 2. 启动前端

需要 Node.js 20+ 和 pnpm。

```bash
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:5173>。

### 3. 使用 Mock 还是真实后端

**只做前端演示，不接后端：**

```bash
pnpm mock
pnpm dev
```

默认 `.env.development`：

```env
VITE_API_BASE_URL=http://127.0.0.1:8082
```

**联调真实后端：**

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

然后重启 `pnpm dev`。后端已允许 `localhost:5173` 和 `127.0.0.1:5173` 跨域。

## 智能体实现

```text
POST /api/v1/plans/generate
  → 创建 plan + task
  → 后台 run_generation()
  → LangGraph 三节点
      1. 策划案 + 预算
      2. 物资 + 分工
      3. 宣传 + 风险 + 复盘
  → BM25 检索 knowledge/
  → content_validator 校验 + 金额重算
  → plan.ready
```

相关文件：

```text
raungong-main/backend/app/agent/langgraph_agent.py
raungong-main/backend/app/agent/rag.py
raungong-main/backend/app/services/generation_service.py
raungong-main/backend/app/services/content_validator.py
raungong-main/backend/app/services/fallback.py
raungong-main/backend/knowledge/campus_activity.md
```

没有 API Key 时，`ENABLE_FALLBACK=true` 会使用规则模板降级，方案详情返回：

```json
{
  "degraded": true,
  "content": {
    "meta": {
      "agent": {
        "provider": "fallback"
      }
    }
  }
}
```

## API 概览

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/healthz` | 健康检查 |
| POST | `/api/v1/auth/register` | 注册 |
| POST | `/api/v1/auth/login` | 登录 |
| GET | `/api/v1/auth/me` | 当前用户 |
| GET | `/api/v1/meta/enums` | 枚举字典 |
| POST | `/api/v1/plans/generate` | 创建生成任务，202 |
| GET | `/api/v1/tasks/{task_id}` | 轮询任务 |
| GET | `/api/v1/plans` | 方案列表 |
| GET | `/api/v1/plans/{plan_id}` | 方案详情 |
| PATCH | `/api/v1/plans/{plan_id}/sections/{section_key}` | 按节编辑 |
| POST | `/api/v1/plans/{plan_id}/duplicate` | 复制方案 |
| DELETE | `/api/v1/plans/{plan_id}` | 删除方案 |
| GET | `/api/v1/plans/{plan_id}/export` | 导出 Markdown |

重复用户名返回：

```json
{
  "detail": {
    "code": "USERNAME_TAKEN",
    "message": "用户名已存在"
  }
}
```

HTTP `409`。

## 文档

- `raungong-main/docs/01-需求分析.md`
- `raungong-main/docs/02-后端开发文档.md`
- `raungong-main/docs/03-接口规范.md`
- `raungong-main/docs/04-前端开发文档.md`
- `raungong-main/contracts/openapi.current.json`
- `raungong-main/contracts/plan-content.schema.json`

前端交付包：

```text
raungong-main/活动智囊-前端交付包.zip
```

## 测试状态

- 43 项前端接口端到端检查通过
- Mock 生成通过
- Dify / Coze 适配器模拟 HTTP 测试通过
- LangGraph 图结构测试通过
- 真实 DeepSeek + LangGraph API 生成通过
- 真实生成耗时约 48 秒
- `degraded=false`，`provider=langgraph`
- Markdown 导出 200

## 已知限制

- 版本历史 / 恢复未实现
- 重新生成某一节未实现
- 模板复用未实现
- 服务端 PDF 未实现（前端用浏览器打印）
- 正式 pytest 测试集未提交
- Render / Supabase 部署未完成
- 真实平台输出仍需按知识库和 schema 持续调优

## 安全

- `.env` 已被 `.gitignore` 忽略，不要提交 Key
- `backend/data/`、`.venv/`、`node_modules/` 不提交
- 前后端生产环境请配置实际域名和 CORS
