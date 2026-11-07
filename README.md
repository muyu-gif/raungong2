# 活动智囊 

面向校园活动的智能策划工作台。填写主题、人数、预算与日期，自动生成包含策划、预算、物资、分工、宣传与风险的活动方案，并支持按节编辑、Markdown 导出与浏览器打印。

前端按《04-前端开发文档 v1.0》实现：接口路径、请求字段、错误格式均与文档一致；文档标注为「未实现」的接口没有任何调用入口。界面采用「初音未来 · 电子舞台」主题：深夜青绿、01 编号、双马尾角色、全息网格与霓虹渐变。

![登录页](docs/screenshots/miku-login.jpg)

## 预览

| 方案详情 | 预算 |
| --- | --- |
| ![方案详情](docs/screenshots/miku-detail.jpg) | ![预算](docs/screenshots/miku-budget.jpg) |

| 打印预览 | 移动端登录 |
| --- | --- |
| ![打印预览](docs/screenshots/miku-print.jpg) | <img src="docs/screenshots/miku-mobile-login.jpg" alt="移动端登录" width="280" /> |

## 技术栈

- Vue 3.5 + Vite 6 + TypeScript
- Pinia、Vue Router
- Element Plus（日期选择、消息与确认框，样式已整体覆盖）
- Axios
- 设计：深空青 / 电子青绿、Bahnschrift + Noto Sans SC、网格舞台、切角卡片与 01 编号、响应式布局

## 本地运行

需要 Node.js 20+ 与 pnpm。

```bash
pnpm install

# 终端 1：本地 Mock 后端（http://127.0.0.1:8082）
pnpm mock

# 终端 2：前端开发服务（http://127.0.0.1:5173）
pnpm dev
```

打开 <http://127.0.0.1:5173>，注册任意账号即可体验完整流程：

- 用户名：3～32 位字母、数字或下划线
- 密码：8～64 位

可选：向 Mock 写入一份演示数据（4 份不同主题的方案，账号 `demo_studio / demo12345`）：

```bash
node devmock/seed-demo.mjs
```

### 对接真实后端

1. 停止 Mock，释放 `8082` 端口；
2. 修改 `.env.development`：

   ```text
   VITE_API_BASE_URL=http://127.0.0.1:8082
   ```

3. 确保后端 CORS 允许 `http://localhost:5173` 与 `http://127.0.0.1:5173`；
4. 重新启动 `pnpm dev`。

生产构建：

```bash
pnpm build          # 先执行 vue-tsc 类型检查，再输出 dist/
pnpm preview        # 本地预览 dist/
```

`.env.production` 中的 `VITE_API_BASE_URL` 需要替换为实际后端域名后再构建。

部署时请把前端路由回退到 `index.html`（history 模式），并确保后端 CORS 允许实际前端域名。

## 页面与路由

| 路由 | 页面 | 说明 |
| --- | --- | --- |
| `/login` | 登录 / 注册 | 注册成功直接登录，登录状态保留 7 天 |
| `/` | 方案档案 | 关键词搜索、分页、空状态与错误状态 |
| `/plans/new` | 新建方案 | 完整表单校验、人均预算核对、幂等提交 |
| `/plans/:id/generating` | 生成进度 | 1 秒轮询、阶段文案、失败/超时、刷新恢复 |
| `/plans/:id` | 方案详情 | 10 个章节、按节编辑、版本冲突处理、导出 |
| `/plans/:id/print` | 打印预览 | 全量只读文档，调用浏览器打印 |

### 方案详情章节

活动概览、筹备阶段、当晚流程、预算、物资、分工、宣传、风险、复盘、警告与假设。

其中可编辑的章节：活动概览与预算（`plan`）、物资（`materials`）、分工（`tasks`）、宣传（`promotion`）、风险（`risks`）、复盘（`review`）。保存时提交整节数据，使用服务端返回的 `version` 与 `data` 更新本地状态。

## 接口对齐说明

| 接口 | 前端实现 |
| --- | --- |
| `GET /healthz` | 侧栏服务状态，60 秒检查一次 |
| `POST /auth/register` | 注册后保存 token 与用户，直接进入工作台 |
| `POST /auth/login` | 错误信息取自 `detail` |
| `GET /auth/me` | 刷新页面时恢复用户，失败清除 token |
| `POST /plans/generate` | 每次新提交生成 UUID 作为 `Idempotency-Key`；网络超时重试复用同一个 key |
| `GET /tasks/{id}` | 1 秒轮询，最长 180 秒；阶段未知时显示「处理中」 |
| `GET /plans` | 只发送 `page`、`page_size`、`keyword`，不发送状态/类型/排序参数 |
| `GET /plans/{id}` | 展示四类状态；`content` 为空时进入等待/失败页面 |
| `PATCH /plans/{id}/sections/{key}` | 整节提交，保存前由前端保证数字与数组类型；409 版本冲突后自动重载 |
| `GET /plans/{id}/export` | `responseType: "blob"`，解析 `filename*` 下载；`inline` 未使用 |

其他对齐细节：

- **task_id 恢复**：生成任务 ID 存在 `sessionStorage`（`plan-task:{planId}`），刷新进度页可继续轮询。当前后端不返回 `latest_task`，若 ID 丢失，页面会先尝试读取方案详情，已生成则直接进入详情，否则给出重新填写的入口。
- **活动类型中文**：本地枚举映射，不依赖 `content.meta.activity_type_label`。
- **错误兼容**：同时处理 `detail` 为字符串、对象、422 数组三种格式；导出接口的错误体是 Blob，会先读为文本再解析。
- **时间**：兼容 SQLite 返回的不带时区时间与 6 位微秒；按浏览器本地时间展示。
- **金额**：统一两位小数；预算编辑仅在前端预览时计算，保存后使用服务端返回的 `items_total_yuan`、`planned_yuan` 与物资 `summary`。
- **活动类型不发送 `template_id`**。
- **401**：清除 token 并跳转登录页，登录后回到原页面。
- **未实现的功能不出现入口**：删除、复制、版本历史、恢复版本、单节重新生成、模板、取消生成、服务端 PDF、归档。

## 目录结构

```text
src/
├── api/                # client、类型、认证、方案接口、错误处理
├── components/
│   ├── detail/         # 10 个方案章节组件
│   ├── AppShell.vue    # 侧栏 / 移动端顶栏
│   ├── AppIcon.vue
│   ├── BrandMark.vue
│   └── ...
├── composables/        # 服务状态检查
├── constants/          # 活动类型、状态、阶段等本地常量
├── stores/auth.ts      # Pinia 认证状态
├── styles/             # 设计变量、基础样式、Element Plus 覆盖、打印样式
├── utils/              # 日期金额、错误、导出、Markdown、表单、会话
├── views/              # 登录、列表、新建、生成、详情、打印
├── router.ts
└── main.ts
devmock/                # 仅用于本地联调的 Mock 后端
docs/screenshots/       # README 截图
```

## 脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动开发服务（5173） |
| `pnpm build` | 类型检查并构建 |
| `pnpm preview` | 预览构建产物（4173） |
| `pnpm typecheck` | 仅执行 `vue-tsc` |
| `pnpm mock` | 启动 Mock 后端（8082） |

## 联调自检

项目已在浏览器中逐项验证：

- 注册、登录、刷新后通过 `/auth/me` 恢复用户；
- 新建方案返回 202，进入进度页并轮询；
- 生成页刷新后从 `sessionStorage` 恢复 task_id，继续轮询并自动进入详情；
- 10 个章节均能渲染，含警告与假设；
- 修改物资数量后，页面使用服务端返回的小计与汇总，版本号自增；
- 修改预算预备金后，计划合计由服务端重算（2,808.00 + 500.00 = 3,308.00）；
- 用旧 `version` 保存返回 409，弹出冲突提示并载入最新版本；
- 导出 Markdown 文件名中文正常，内容含全部章节；
- 打印预览覆盖全部章节，可用浏览器「另存为 PDF」；
- 失效 token 自动跳转登录页；
- 生成失败时展示错误码与可重试提示；
- 移动端列表、表单、详情与堆叠表格均可用。

可选的浏览器冒烟测试（需要 Python Playwright 与 Edge）：

```bash
python devmock/ui-check.py
```

## 说明

- `devmock/` 是本地联调用的内存 Mock，重启即清空，不用于生产；它覆盖文档中的全部 10 个接口及三种错误格式。
- 当前后端没有 PDF 接口，打印页使用浏览器打印能力；也没有刷新令牌接口，token 过期需重新登录。
- 页面优先使用系统已安装的 Bahnschrift 与 Noto Sans SC，未安装时回退到系统无衬线字体。

### 角色与素材

登录页、空状态与右下角使用的双马尾角色是项目内的原创 SVG 插画（[MikuMascot.vue](src/components/MikuMascot.vue)），以初音未来的青色双马尾、耳机和「01」编号作为同人风格装饰，不包含外部图片素材。初音未来及相关名称版权归 Crypton Future Media 所有，仅用于非商业演示。
