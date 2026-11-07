/**
 * 本地 Mock 后端（仅用于前端联调，不属于交付前端代码）。
 * 严格按《04-前端开发文档》的接口、字段与错误格式实现：
 *   GET    /healthz
 *   POST   /api/v1/auth/register
 *   POST   /api/v1/auth/login
 *   GET    /api/v1/auth/me
 *   POST   /api/v1/plans/generate
 *   GET    /api/v1/tasks/{task_id}
 *   GET    /api/v1/plans
 *   GET    /api/v1/plans/{plan_id}
 *   PATCH  /api/v1/plans/{plan_id}/sections/{section_key}
 *   GET    /api/v1/plans/{plan_id}/export
 *
 * 启动：npm run mock（默认 http://127.0.0.1:8082）
 */
import http from "node:http";
import crypto from "node:crypto";
import { buildContent, buildMarkdown } from "./content.mjs";

const PORT = Number(process.env.PORT || 8082);
const ACTIVITY_TYPES = new Set([
  "welcome_party",
  "club_recruitment",
  "team_building",
  "lecture",
  "sports",
  "arts",
  "volunteer",
  "competition",
  "other",
]);
const TONES = new Set(["lively", "warm", "formal", "creative"]);
const SECTION_KEYS = new Set(["plan", "materials", "tasks", "promotion", "risks", "review"]);

const users = new Map();
const usernames = new Map();
const passwords = new Map();
const tokens = new Map();
const plans = new Map();
const tasks = new Map();
const idempotency = new Map();

function pad(value) {
  return String(value).padStart(2, "0");
}

function isoLocal(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function json(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Disposition",
    ...headers,
  });
  res.end(body);
}

function text(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/markdown; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Expose-Headers": "Content-Disposition",
    ...headers,
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        reject(new Error("payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("invalid json"));
      }
    });
    req.on("error", reject);
  });
}

function validationError(loc, msg, input) {
  return { type: "value_error", loc: ["body", ...loc], msg, input };
}

function getUser(req) {
  const header = req.headers.authorization ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return null;
  const userId = tokens.get(match[1]);
  return userId ? users.get(userId) ?? null : null;
}

function requireUser(req, res) {
  const user = getUser(req);
  if (!user) {
    json(res, 401, { detail: "登录状态已失效，请重新登录" });
    return null;
  }
  return user;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    display_name: user.display_name,
    role: user.role,
    created_at: user.created_at,
  };
}

function planListItem(plan) {
  return {
    id: plan.id,
    title: plan.title,
    theme: plan.theme,
    activity_type: plan.activity_type,
    participants: plan.participants,
    budget_yuan: plan.budget_yuan,
    starts_at: plan.starts_at,
    location: plan.location,
    status: plan.status,
    degraded: plan.degraded,
    version: plan.version,
    summary: plan.summary,
    created_at: plan.created_at,
    updated_at: plan.updated_at,
  };
}

function planDetail(plan) {
  return {
    ...planListItem(plan),
    input: plan.input,
    content: plan.content,
  };
}

function taskView(task) {
  return {
    task_id: task.id,
    plan_id: task.plan_id,
    type: task.type,
    section_key: task.section_key,
    status: task.status,
    stage: task.stage,
    progress: task.progress,
    message: task.message,
    attempt: task.attempt,
    error: task.error,
    created_at: task.created_at,
    started_at: task.started_at,
    finished_at: task.finished_at,
  };
}

function advanceTask(task) {
  if (task.status === "succeeded" || task.status === "failed") return;
  const plan = plans.get(task.plan_id);
  const elapsed = Date.now() - task.created_ms;

  if (task.shouldFail) {
    if (elapsed < 1500) {
      task.status = "running";
      task.stage = "planning";
      task.progress = 40;
      task.message = "正在生成策划案";
      task.started_at = task.started_at ?? isoLocal();
      if (plan) plan.updated_at = isoLocal();
      return;
    }
    task.status = "failed";
    task.stage = null;
    task.progress = 0;
    task.message = "生成失败";
    task.error = { code: "MOCK_GENERATION_FAILED", message: "plan not found", retryable: true };
    task.finished_at = isoLocal();
    if (plan) {
      plan.status = "failed";
      plan.updated_at = isoLocal();
    }
    return;
  }

  if (elapsed < 600) {
    task.status = "queued";
    task.stage = null;
    task.progress = 0;
    task.message = "任务已排队";
    return;
  }

  if (elapsed < 3200) {
    const ratio = Math.min(1, (elapsed - 600) / 2600);
    task.status = "running";
    task.stage = "planning";
    task.progress = Math.min(95, 20 + Math.floor(ratio * 75));
    task.message = "正在生成策划案";
    task.started_at = task.started_at ?? isoLocal();
    return;
  }

  task.status = "succeeded";
  task.stage = "done";
  task.progress = 100;
  task.message = "生成完成";
  task.started_at = task.started_at ?? task.created_at;
  task.finished_at = isoLocal();

  if (plan) {
    const content = buildContent(plan.input);
    plan.content = content;
    plan.status = "ready";
    plan.summary = content.plan.summary;
    plan.updated_at = isoLocal();
  }
}

function sectionError(res, status, detail) {
  json(res, status, { detail });
}

function requirePlan(req, res, planId) {
  const user = requireUser(req, res);
  if (!user) return null;
  const plan = plans.get(planId);
  if (!plan || plan.user_id !== user.id) {
    sectionError(res, 404, "方案不存在");
    return null;
  }
  return plan;
}

function normalizeInput(body, errors) {
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";
  if (theme.length < 2 || theme.length > 60) {
    errors.push(validationError(["theme"], "String should have at least 2 and at most 60 characters", body.theme));
  }

  const activityType = body.activity_type;
  if (!ACTIVITY_TYPES.has(activityType)) {
    errors.push(validationError(["activity_type"], "Input should be a valid activity type", activityType));
  }

  const participants = body.participants;
  if (!Number.isInteger(participants) || participants < 10 || participants > 2000) {
    errors.push(
      validationError(["participants"], "Input should be greater than or equal to 10 and less than or equal to 2000", participants),
    );
  }

  const budget = body.budget_yuan;
  if (typeof budget !== "number" || Number.isNaN(budget) || budget < 0 || budget > 1000000) {
    errors.push(validationError(["budget_yuan"], "Input should be between 0 and 1000000", budget));
  } else if (Math.abs(Math.round(budget * 100) - budget * 100) > 1e-6) {
    errors.push(validationError(["budget_yuan"], "Input should have at most 2 decimal places", budget));
  }

  const startsAt = body.starts_at;
  if (typeof startsAt !== "string" || Number.isNaN(new Date(startsAt).getTime())) {
    errors.push(validationError(["starts_at"], "Input should be a valid datetime", startsAt));
  }

  const duration = body.duration_minutes ?? 120;
  if (!Number.isInteger(duration) || duration < 30 || duration > 480) {
    errors.push(validationError(["duration_minutes"], "Input should be between 30 and 480", duration));
  }

  const location = typeof body.location === "string" ? body.location.trim() : "";
  if (location.length < 1 || location.length > 120) {
    errors.push(validationError(["location"], "String should have at least 1 and at most 120 characters", body.location));
  }

  const targetAudience = body.target_audience ?? null;
  if (targetAudience !== null && (typeof targetAudience !== "string" || targetAudience.length > 120)) {
    errors.push(validationError(["target_audience"], "String should have at most 120 characters", targetAudience));
  }

  const goals = body.goals ?? [];
  if (!Array.isArray(goals) || goals.length > 5 || goals.some((goal) => typeof goal !== "string")) {
    errors.push(validationError(["goals"], "List should contain at most 5 strings", goals));
  }

  const constraints = body.constraints ?? null;
  if (constraints !== null && (typeof constraints !== "string" || constraints.length > 500)) {
    errors.push(validationError(["constraints"], "String should have at most 500 characters", constraints));
  }

  const tone = body.tone ?? "lively";
  if (!TONES.has(tone)) {
    errors.push(validationError(["tone"], "Input should be a valid tone", tone));
  }

  const extraNotes = body.extra_notes ?? null;
  if (extraNotes !== null && (typeof extraNotes !== "string" || extraNotes.length > 500)) {
    errors.push(validationError(["extra_notes"], "String should have at most 500 characters", extraNotes));
  }

  return {
    theme,
    activity_type: activityType,
    participants,
    budget_yuan: budget,
    starts_at: startsAt,
    duration_minutes: duration,
    location,
    target_audience: targetAudience,
    goals,
    constraints,
    tone,
    extra_notes: extraNotes,
  };
}

async function handle(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, Idempotency-Key",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Max-Age": "86400",
    });
    res.end();
    return;
  }

  if (path === "/healthz" && method === "GET") {
    return json(res, 200, { status: "ok", service: "activity-mind" });
  }

  if (path === "/api/v1/auth/register" && method === "POST") {
    const body = await readJson(req);
    const errors = [];
    const username = typeof body.username === "string" ? body.username.trim() : "";
    if (!/^[A-Za-z0-9_]{3,32}$/.test(username)) {
      errors.push(validationError(["username"], "String should match pattern ^[A-Za-z0-9_]{3,32}$", body.username));
    }
    if (typeof body.password !== "string" || body.password.length < 8 || body.password.length > 64) {
      errors.push(validationError(["password"], "String should have at least 8 and at most 64 characters", body.password));
    }
    const displayName = typeof body.display_name === "string" ? body.display_name.trim() : "";
    if (displayName.length < 1 || displayName.length > 50) {
      errors.push(validationError(["display_name"], "String should have at least 1 and at most 50 characters", body.display_name));
    }
    if (errors.length) return json(res, 422, { detail: errors });
    if (usernames.has(username)) return json(res, 409, { detail: { code: "USERNAME_TAKEN", message: "用户名已存在" } });

    const id = crypto.randomUUID();
    const user = {
      id,
      username,
      display_name: displayName,
      role: "user",
      created_at: isoLocal(),
    };
    users.set(id, user);
    usernames.set(username, id);
    passwords.set(id, body.password);
    const token = `mock_${id}_${crypto.randomBytes(16).toString("hex")}`;
    tokens.set(token, id);
    return json(res, 201, {
      access_token: token,
      token_type: "bearer",
      expires_in: 604800,
      user: publicUser(user),
    });
  }

  if (path === "/api/v1/auth/login" && method === "POST") {
    const body = await readJson(req);
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const userId = usernames.get(username);
    if (!userId || passwords.get(userId) !== body.password) {
      return json(res, 401, { detail: "用户名或密码错误" });
    }
    const user = users.get(userId);
    const token = `mock_${userId}_${crypto.randomBytes(16).toString("hex")}`;
    tokens.set(token, userId);
    return json(res, 200, {
      access_token: token,
      token_type: "bearer",
      expires_in: 604800,
      user: publicUser(user),
    });
  }

  if (path === "/api/v1/auth/me" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    return json(res, 200, publicUser(user));
  }

  if (path === "/api/v1/plans/generate" && method === "POST") {
    const user = requireUser(req, res);
    if (!user) return;

    const body = await readJson(req);
    const errors = [];
    const input = normalizeInput(body, errors);
    if (errors.length) return json(res, 422, { detail: errors });

    const idempotencyKey = req.headers["idempotency-key"];
    if (idempotencyKey && idempotency.has(idempotencyKey)) {
      const existingTask = tasks.get(idempotency.get(idempotencyKey));
      if (existingTask && existingTask.user_id === user.id) {
        return json(res, 202, {
          task_id: existingTask.id,
          plan_id: existingTask.plan_id,
          status: "queued",
          reused: true,
          estimated_seconds: 3,
          poll_after_ms: 1000,
          poll_url: `/api/v1/tasks/${existingTask.id}`,
        });
      }
    }

    const now = isoLocal();
    const planId = crypto.randomUUID();
    const plan = {
      id: planId,
      user_id: user.id,
      title: `${input.theme}活动方案`,
      theme: input.theme,
      activity_type: input.activity_type,
      participants: input.participants,
      budget_yuan: input.budget_yuan,
      starts_at: isoLocal(input.starts_at),
      location: input.location,
      status: "generating",
      version: 1,
      summary: null,
      degraded: false,
      input,
      content: null,
      created_at: now,
      updated_at: now,
    };
    plans.set(planId, plan);

    const taskId = crypto.randomUUID();
    const task = {
      id: taskId,
      plan_id: planId,
      user_id: user.id,
      type: "generate",
      section_key: null,
      status: "queued",
      stage: null,
      progress: 0,
      message: "任务已排队",
      attempt: 1,
      error: null,
      created_at: now,
      started_at: null,
      finished_at: null,
      created_ms: Date.now(),
      shouldFail: String(input.theme).includes("失败"),
    };
    tasks.set(taskId, task);
    if (idempotencyKey) idempotency.set(idempotencyKey, taskId);

    return json(res, 202, {
      task_id: taskId,
      plan_id: planId,
      status: "queued",
      reused: false,
      estimated_seconds: 3,
      poll_after_ms: 1000,
      poll_url: `/api/v1/tasks/${taskId}`,
    });
  }

  const taskMatch = /^\/api\/v1\/tasks\/([^/]+)$/.exec(path);
  if (taskMatch && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;
    const task = tasks.get(taskMatch[1]);
    if (!task || task.user_id !== user.id) return json(res, 404, { detail: "任务不存在" });
    advanceTask(task);
    return json(res, 200, taskView(task));
  }

  if (path === "/api/v1/plans" && method === "GET") {
    const user = requireUser(req, res);
    if (!user) return;

    const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const pageSizeRaw = Number.parseInt(url.searchParams.get("page_size") ?? "20", 10) || 20;
    const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
    const keyword = (url.searchParams.get("keyword") ?? "").trim().slice(0, 50).toLowerCase();

    let items = [...plans.values()].filter((plan) => plan.user_id === user.id);
    if (keyword) {
      items = items.filter(
        (plan) => plan.title.toLowerCase().includes(keyword) || plan.theme.toLowerCase().includes(keyword),
      );
    }
    items.sort((a, b) => b.created_at.localeCompare(a.created_at));

    const total = items.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize).map(planListItem);

    return json(res, 200, {
      items: pageItems,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        has_more: page < totalPages,
      },
    });
  }

  const sectionMatch = /^\/api\/v1\/plans\/([^/]+)\/sections\/([^/]+)$/.exec(path);
  if (sectionMatch && method === "PATCH") {
    const plan = requirePlan(req, res, sectionMatch[1]);
    if (!plan) return;
    const sectionKey = sectionMatch[2];

    if (plan.status !== "ready") return sectionError(res, 409, "方案尚未生成完成");
    if (!SECTION_KEYS.has(sectionKey)) return sectionError(res, 400, "不支持的 section_key");

    const body = await readJson(req);
    if (typeof body.version !== "number" || typeof body.data !== "object" || body.data === null || Array.isArray(body.data)) {
      return json(res, 422, {
        detail: [validationError(["data"], "Field required", body.data)],
      });
    }

    if (body.version !== plan.version) {
      return json(res, 409, {
        detail: {
          code: "VERSION_CONFLICT",
          message: "方案已被其他页面修改，请刷新后重试",
          current_version: plan.version,
        },
      });
    }

    const data = JSON.parse(JSON.stringify(body.data));
    const content = plan.content;

    if (sectionKey === "plan") {
      const budget = data.budget ?? {};
      const items = Array.isArray(budget.items) ? budget.items : [];
      for (const item of items) {
        item.quantity = Number(item.quantity) || 0;
        item.unit_price_yuan = Number(item.unit_price_yuan) || 0;
        item.amount_yuan = Math.round(item.quantity * item.unit_price_yuan * 100) / 100;
      }
      budget.items = items;
      budget.items_total_yuan = Math.round(items.reduce((sum, item) => sum + item.amount_yuan, 0) * 100) / 100;
      budget.contingency_yuan = Number(budget.contingency_yuan) || 0;
      budget.planned_yuan = Math.round((budget.items_total_yuan + budget.contingency_yuan) * 100) / 100;
      data.budget = budget;
      content.plan = data;
    } else if (sectionKey === "materials") {
      const items = Array.isArray(data.items) ? data.items : [];
      for (const item of items) {
        item.quantity = Number(item.quantity) || 0;
        item.unit_price_yuan = Number(item.unit_price_yuan) || 0;
        item.subtotal_yuan = Math.round(item.quantity * item.unit_price_yuan * 100) / 100;
      }
      data.items = items;
      data.summary = {
        total_items: items.length,
        total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
        estimated_cost_yuan: Math.round(items.reduce((sum, item) => sum + item.subtotal_yuan, 0) * 100) / 100,
      };
      content.materials = data;
    } else if (sectionKey === "tasks") {
      const items = Array.isArray(data.items) ? data.items : [];
      const byPriority = { high: 0, medium: 0, low: 0 };
      for (const item of items) {
        if (item.priority in byPriority) byPriority[item.priority] += 1;
      }
      data.summary = { total: items.length, by_priority: byPriority };
      content.tasks = data;
    } else if (sectionKey === "risks") {
      const items = Array.isArray(data.items) ? data.items : [];
      const summary = { total: items.length, high: 0, medium: 0, low: 0 };
      for (const item of items) {
        if (item.level === "high" || item.level === "critical") summary.high += 1;
        else if (item.level === "medium") summary.medium += 1;
        else summary.low += 1;
      }
      data.summary = summary;
      content.risks = data;
    } else {
      content[sectionKey] = data;
    }

    plan.version += 1;
    plan.updated_at = isoLocal();

    return json(res, 200, {
      plan_id: plan.id,
      section_key: sectionKey,
      version: plan.version,
      data: content[sectionKey],
      updated_at: plan.updated_at,
    });
  }

  const exportMatch = /^\/api\/v1\/plans\/([^/]+)\/export$/.exec(path);
  if (exportMatch && method === "GET") {
    const plan = requirePlan(req, res, exportMatch[1]);
    if (!plan) return;

    const format = (url.searchParams.get("format") ?? "markdown").toLowerCase();
    if (format !== "markdown" && format !== "md") {
      return json(res, 400, { detail: "目前只支持 markdown" });
    }
    if (plan.status !== "ready" || !plan.content) {
      return json(res, 409, { detail: "方案尚未生成完成" });
    }

    const markdown = buildMarkdown(plan);
    const inline = url.searchParams.get("inline") === "true";
    const filename = `${plan.title}.md`;
    const disposition = `${inline ? "inline" : "attachment"}; filename="activity-mind-plan.md"; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`;
    return text(res, 200, markdown, { "Content-Disposition": disposition });
  }

  const planMatch = /^\/api\/v1\/plans\/([^/]+)$/.exec(path);
  if (planMatch && method === "GET") {
    const plan = requirePlan(req, res, planMatch[1]);
    if (!plan) return;
    return json(res, 200, planDetail(plan));
  }

  return json(res, 404, { detail: "接口不存在" });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (error?.message === "invalid json") {
      json(res, 400, { detail: "请求体不是合法 JSON" });
      return;
    }
    console.error("[mock] unhandled error", error);
    json(res, 500, { detail: "服务器内部错误，请稍后重试" });
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[mock] 活动智囊 Mock 后端已启动：http://127.0.0.1:${PORT}`);
  console.log(`[mock] 健康检查：http://127.0.0.1:${PORT}/healthz`);
  console.log("[mock] 数据保存在内存中，重启即清空。");
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`[mock] 端口 ${PORT} 已被占用，请先停止占用该端口的服务。`);
  } else {
    console.error("[mock] 启动失败", error);
  }
  process.exitCode = 1;
});
