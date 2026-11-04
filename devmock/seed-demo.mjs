/** 仅用于生成 README 截图时的演示数据，不属于应用代码。 */
const BASE = "http://127.0.0.1:8082";

const plans = [
  {
    theme: "2026 级迎新晚会",
    activity_type: "welcome_party",
    participants: 120,
    budget_yuan: 3600,
    starts_at: "2026-11-20T19:00:00+08:00",
    duration_minutes: 120,
    location: "学校礼堂",
    target_audience: "2026 级新生与社团成员",
    goals: ["帮助新生融入校园", "展示社团风采"],
    constraints: "室内礼堂，禁止明火；音响由场地提供。",
    tone: "lively",
    extra_notes: "希望安排一次抽奖互动，并为嘉宾准备伴手礼。",
  },
  {
    theme: "社团秋季招新市集",
    activity_type: "club_recruitment",
    participants: 300,
    budget_yuan: 5200,
    starts_at: "2026-11-14T10:00:00+08:00",
    duration_minutes: 240,
    location: "中心广场",
    target_audience: "全校学生",
    goals: ["让新生找到感兴趣的社团", "完成 200 人意向登记"],
    tone: "creative",
  },
  {
    theme: "新生班级破冰团建",
    activity_type: "team_building",
    participants: 45,
    budget_yuan: 1200,
    starts_at: "2026-11-12T14:00:00+08:00",
    duration_minutes: 180,
    location: "大学生活动中心 302",
    target_audience: "软件工程 1 班",
    goals: ["认识同班同学", "形成班级分工小组"],
    tone: "warm",
  },
  {
    theme: "校园开放麦分享会",
    activity_type: "lecture",
    participants: 80,
    budget_yuan: 900,
    starts_at: "2026-12-03T19:30:00+08:00",
    duration_minutes: 90,
    location: "图书馆报告厅",
    target_audience: "对表达感兴趣的同学",
    goals: ["降低公开表达的门槛", "沉淀 5 个可复用的分享主题"],
    tone: "formal",
  },
];

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!response.ok) throw new Error(`${response.status} ${text}`);
  return { data, headers: response.headers };
}

async function main() {
  const credentials = { username: "demo_studio", password: "demo12345" };
  let auth;
  try {
    const { data } = await request("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...credentials, display_name: "演示用户" }),
    });
    auth = data;
  } catch {
    const { data } = await request("/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });
    auth = data;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.access_token}`,
  };

  for (const plan of plans) {
    const { data } = await request("/api/v1/plans/generate", {
      method: "POST",
      headers: { ...headers, "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify(plan),
    });
    for (let i = 0; i < 40; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const task = await request(`/api/v1/tasks/${data.task_id}`, { headers });
      if (task.data.status === "succeeded") {
        console.log("ready", plan.theme, data.plan_id);
        break;
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
