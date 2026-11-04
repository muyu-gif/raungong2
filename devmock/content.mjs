/**
 * 仅用于本地联调的 Mock 数据生成器。
 * 返回结构与《04-前端开发文档》第 6.4 节的 PlanContent 对齐。
 */

const TYPE_LABELS = {
  welcome_party: "迎新晚会",
  club_recruitment: "社团招新",
  team_building: "团建/破冰",
  lecture: "讲座/分享会",
  sports: "体育比赛/运动会",
  arts: "文艺比赛/文化节",
  volunteer: "志愿服务",
  competition: "学科竞赛",
  other: "其他",
};

const TONE_LABELS = {
  lively: "轻松活泼",
  warm: "温馨走心",
  formal: "正式庄重",
  creative: "创意跳脱",
};

const TYPE_FLAVOR = {
  welcome_party: {
    opening: "开场灯光秀与社团联合演出",
    middle: "社团风采展示与全场互动游戏",
    closing: "迎新寄语与全场大合影",
  },
  club_recruitment: {
    opening: "社团快闪展示",
    middle: "摊位巡游与社团体验打卡",
    closing: "意向登记与集中答疑",
  },
  team_building: {
    opening: "破冰分组与队名口号",
    middle: "协作挑战与积分竞赛",
    closing: "颁奖与自由交流",
  },
  lecture: {
    opening: "主持人介绍与嘉宾致辞",
    middle: "主题分享与圆桌对谈",
    closing: "现场问答与合影",
  },
  sports: {
    opening: "入场式与热身",
    middle: "正式比赛与轮次间歇",
    closing: "颁奖与闭幕合影",
  },
  arts: {
    opening: "参赛作品展示",
    middle: "现场展演与评委点评",
    closing: "公布结果与合影",
  },
  volunteer: {
    opening: "集合签到与任务说明",
    middle: "分组服务与现场协作",
    closing: "总结分享与签退",
  },
  competition: {
    opening: "赛制说明与抽签",
    middle: "正式竞赛与评审",
    closing: "颁奖与经验交流",
  },
  other: {
    opening: "开场介绍",
    middle: "主题活动环节",
    closing: "总结与合影",
  },
};

const OWNERS = ["林晓", "陈默", "周雨", "李想", "王宁", "赵可"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function addDays(base, days) {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
}

function dateOnly(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function clock(value) {
  const date = new Date(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function monthDay(value) {
  const date = new Date(value);
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

function isoLocal(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function clean(text) {
  return String(text ?? "").replace(/\|/g, "／").replace(/\s+/g, " ").trim();
}

function budgetItems(input) {
  const budget = Number(input.budget_yuan);
  const people = Number(input.participants);
  const base = [
    { category: "场地与设备", name: "音响与话筒租赁", unit: "套", qty: 1, share: 0.18, note: "含无线麦 2 支、调音台" },
    { category: "场地与设备", name: "场地布置与灯光", unit: "项", qty: 1, share: 0.16, note: "背景桁架、气球与地灯" },
    { category: "物料制作", name: "主视觉背景板", unit: "块", qty: 1, share: 0.1, note: "3m × 2m 喷绘" },
    {
      category: "物料制作",
      name: "手举牌与胸牌",
      unit: "套",
      qty: Math.max(6, Math.ceil(people / 12)),
      share: 0.06,
      note: "按到场人数分批发放",
    },
    {
      category: "宣传",
      name: "海报与传单印制",
      unit: "张",
      qty: Math.max(20, people),
      share: 0.05,
      note: "A3 海报 + A5 传单",
    },
    {
      category: "餐饮",
      name: "瓶装饮用水",
      unit: "箱",
      qty: Math.max(2, Math.ceil(people / 24)),
      share: 0.04,
      note: "每箱 24 瓶",
    },
    {
      category: "奖品",
      name: "互动与抽奖奖品",
      unit: "份",
      qty: Math.max(4, Math.ceil(people / 30)),
      share: 0.14,
      note: "分设一、二、三等奖",
    },
    { category: "机动", name: "应急与杂项", unit: "项", qty: 1, share: 0.05, note: "备用电池、医药包等" },
  ];

  return base.map((item, index) => {
    const amount = round2(budget * item.share);
    const unitPrice = round2(amount / item.qty);
    return {
      id: `B${index + 1}`,
      category: item.category,
      name: item.name,
      unit: item.unit,
      quantity: item.qty,
      unit_price_yuan: unitPrice,
      amount_yuan: round2(unitPrice * item.qty),
      note: item.note,
    };
  });
}

function materialItems(input, budget) {
  const people = Number(input.participants);
  const channels = ["校内打印店", "淘宝采购", "京东自营", "校团委借调", "大型超市"];
  const specs = {
    音响与话筒租赁: "双 15 寸音箱 + 无线麦",
    场地布置与灯光: "桁架、气球、LED 地灯",
    主视觉背景板: "3m × 2m 喷绘",
    手举牌与胸牌: "亚克力胸牌 + 手举牌",
    海报与传单印制: "A3 海报 / A5 传单",
    瓶装饮用水: "550ml × 24 瓶",
    互动与抽奖奖品: "文创礼盒与代金券",
    应急与杂项: "电池、医药包、胶带",
  };

  const rows = budget.items.map((item, index) => ({
    id: `M${index + 1}`,
    category: item.category,
    name: item.name,
    spec: specs[item.name] ?? "按活动需求配置",
    unit: item.unit,
    quantity: item.quantity,
    unit_price_yuan: item.unit_price_yuan,
    subtotal_yuan: item.amount_yuan,
    purchase_channel: channels[index % channels.length],
    owner: OWNERS[index % OWNERS.length],
    needed_by: dateOnly(addDays(input.starts_at, index < 3 ? -5 : -2)),
    status: ["pending", "purchased", "pending", "borrowed", "pending", "purchased", "ready", "pending"][index % 8],
    note: index === 0 ? "提前一天完成设备联调" : "",
  }));

  rows.push(
    {
      id: "M9",
      category: "现场用品",
      name: "签到表与签字笔",
      spec: "A4 签到表 10 张",
      unit: "套",
      quantity: 1,
      unit_price_yuan: 15,
      subtotal_yuan: 15,
      purchase_channel: "校内打印店",
      owner: "周雨",
      needed_by: dateOnly(addDays(input.starts_at, -2)),
      status: "purchased",
      note: "按报名名单分栏打印",
    },
    {
      id: "M10",
      category: "现场用品",
      name: "垃圾袋与清洁用品",
      spec: "大号垃圾袋 50 只",
      unit: "包",
      quantity: 1,
      unit_price_yuan: 12,
      subtotal_yuan: 12,
      purchase_channel: "大型超市",
      owner: "王宁",
      needed_by: dateOnly(addDays(input.starts_at, -1)),
      status: "pending",
      note: `按 ${people} 人规模预留两处垃圾点`,
    },
  );

  const totalQuantity = rows.reduce((sum, item) => sum + item.quantity, 0);
  const estimated = round2(rows.reduce((sum, item) => sum + item.subtotal_yuan, 0));

  return {
    items: rows,
    summary: {
      total_items: rows.length,
      total_quantity: totalQuantity,
      estimated_cost_yuan: estimated,
    },
  };
}

export function buildContent(input) {
  const startsAt = new Date(input.starts_at);
  const duration = Number(input.duration_minutes || 120);
  const people = Number(input.participants);
  const budget = Number(input.budget_yuan);
  const typeLabel = TYPE_LABELS[input.activity_type] ?? "其他";
  const flavor = TYPE_FLAVOR[input.activity_type] ?? TYPE_FLAVOR.other;
  const audience = input.target_audience || `${people} 位参与者`;
  const toneLabel = TONE_LABELS[input.tone] ?? "轻松活泼";
  const goals = Array.isArray(input.goals) && input.goals.length ? input.goals.filter(Boolean) : [];
  const title = `${input.theme}活动方案`;
  const owner = (index) => OWNERS[index % OWNERS.length];

  const objectives = goals.length
    ? goals.slice(0, 5)
    : [
        `让${audience}完整参与一次有记忆点的${typeLabel}`,
        `在 ${dateOnly(startsAt)} 前完成场地、物料与人员准备`,
        `把总支出控制在 ¥${round2(budget).toLocaleString("zh-CN")} 以内`,
        `沉淀一份可复用的活动流程与分工模板`,
      ];

  const highlights = [
    flavor.opening,
    `${flavor.middle}，设置至少 2 个可参与的互动点位`,
    `现场抽取 ${Math.max(4, Math.ceil(people / 30))} 份互动奖品`,
    `用一块主视觉背景板串起签到、合影与传播素材`,
  ];

  const successCriteria = [
    `实际到场率不低于 90%，签到人数达到 ${Math.max(10, Math.round(people * 0.9))} 人`,
    "现场无安全事故，设备故障在 10 分钟内恢复",
    "活动结束后 24 小时内完成图文复盘与费用对账",
  ];

  const summary = `面向${audience}，${monthDay(startsAt)}在${input.location}举办，预计 ${people} 人参与，全程约 ${duration} 分钟。方案以${toneLabel}的基调组织，覆盖场地设备、物料制作、宣传、餐饮与奖品，预算控制在 ¥${round2(
    budget,
  ).toLocaleString("zh-CN")} 以内。`;

  const background = `新学期活动密集，${audience}对${typeLabel}类活动的参与意愿较高，但筹备窗口通常只有两到三周。${
    goals.length ? `本次活动重点回应「${goals.slice(0, 2).join("」「")}」两个诉求，` : ""
  }需要在有限预算内把流程、物料与人员安排一次性讲清楚，避免临场补位。`;

  const phases = [
    {
      id: "P1",
      name: "立项与统筹",
      start_date: dateOnly(addDays(startsAt, -21)),
      end_date: dateOnly(addDays(startsAt, -14)),
      goal: "把活动目标、预算上限与责任人定下来，完成场地与审批。",
      key_actions: ["确认主题、规模与预算上限", "建立筹备群，明确五个小组负责人", "提交场地申请与活动审批"],
      owner: `统筹组 · ${owner(0)}`,
      deliverables: ["活动立项单", "分组分工表", "场地与审批回执"],
    },
    {
      id: "P2",
      name: "宣传与报名",
      start_date: dateOnly(addDays(startsAt, -14)),
      end_date: dateOnly(addDays(startsAt, -7)),
      goal: "完成主视觉与文案，把报名量做到目标人数的 1.1 倍。",
      key_actions: ["确定口号与主视觉", "公众号推文与班级群同步发布", "建立报名接龙并每日核对"],
      owner: `宣传组 · ${owner(1)}`,
      deliverables: ["主视觉与海报", "推文链接", "报名名单"],
    },
    {
      id: "P3",
      name: "物料与彩排",
      start_date: dateOnly(addDays(startsAt, -7)),
      end_date: dateOnly(addDays(startsAt, -1)),
      goal: "物料到位、设备联调完成，流程至少完整走一遍。",
      key_actions: ["按清单采购与借调物资", "确认音响、投影与话筒", "完成主持人串词与全流程彩排"],
      owner: `物料组 · ${owner(2)}`,
      deliverables: ["物资签收表", "设备清单", "彩排记录"],
    },
    {
      id: "P4",
      name: "现场与复盘",
      start_date: dateOnly(startsAt),
      end_date: dateOnly(addDays(startsAt, 2)),
      goal: "按流程完成现场执行，并在两天内完成复盘。",
      key_actions: ["提前 2 小时进场布置", "按流程单执行并记录偏差", "完成费用对账与图文复盘"],
      owner: `现场组 · ${owner(3)}`,
      deliverables: ["现场流程单", "费用对账表", "复盘文档"],
    },
  ];

  const rundownTemplate = [
    { segment: "暖场与签到", ratio: 0.12, content: "循环播放暖场音乐，签到并发放物料", role: "签到组" },
    { segment: "开场", ratio: 0.08, content: flavor.opening, role: "主持人" },
    { segment: "主题环节", ratio: 0.23, content: `${flavor.middle}（上半场）`, role: "节目组" },
    { segment: "互动环节", ratio: 0.17, content: "分组互动与现场抽奖", role: "互动组" },
    { segment: "主题环节", ratio: 0.2, content: `${flavor.middle}（下半场）`, role: "节目组" },
    { segment: "收尾", ratio: 0.12, content: flavor.closing, role: "统筹组" },
    { segment: "散场", ratio: 0.05, content: "引导离场、清点物资与合影", role: "后勤组" },
    { segment: "复盘", ratio: 0.03, content: "现场快速复盘，记录问题与改进项", role: "统筹组" },
  ];

  let cursor = new Date(startsAt);
  let allocated = 0;
  const rundown = rundownTemplate.map((item, index) => {
    const isLast = index === rundownTemplate.length - 1;
    const minutes = isLast
      ? Math.max(3, duration - allocated)
      : Math.max(3, Math.round(duration * item.ratio));
    allocated += minutes;
    const start = new Date(cursor);
    const end = new Date(cursor.getTime() + minutes * 60 * 1000);
    cursor = end;
    return {
      seq: index + 1,
      start_time: clock(start),
      end_time: clock(end),
      duration_minutes: minutes,
      segment: item.segment,
      content: item.content,
      owner: `${item.role} · ${owner(index)}`,
      location: index === 0 ? `${input.location}入口` : input.location,
      notes: index === 0 ? "提前 30 分钟开放入场" : index === rundownTemplate.length - 1 ? "清点物资后再离场" : "",
    };
  });

  const items = budgetItems(input);
  const itemsTotal = round2(items.reduce((sum, item) => sum + item.amount_yuan, 0));
  const contingency = round2(Math.max(0, Math.min(budget * 0.08, budget - itemsTotal)));
  const planned = round2(itemsTotal + contingency);
  const funding = [
    { name: "学院 / 单位拨款", amount_yuan: round2(budget * 0.6) },
    { name: "社团自筹", amount_yuan: round2(budget * 0.25) },
    { name: "赞助与赞助物资", amount_yuan: round2(budget - round2(budget * 0.6) - round2(budget * 0.25)) },
  ];

  const materials = materialItems(input, { items });

  const taskTemplate = [
    ["立项与统筹", "确认活动方案与预算", "统筹", -21, -18, "high", "策划案与预算表经指导老师确认", []],
    ["立项与统筹", "提交场地申请与活动审批", "统筹", -20, -16, "high", "拿到场地回执与审批编号", ["T1"]],
    ["宣传与报名", "完成主视觉与海报设计", "宣传", -14, -11, "high", "主视觉输出 2 版，确定 1 版", ["T1"]],
    ["宣传与报名", "公众号推文与班级群发布", "宣传", -12, -8, "medium", "推文阅读量达到 500+", ["T3"]],
    ["宣传与报名", "报名名单核对与提醒", "宣传", -8, -3, "medium", "报名人数达到目标人数的 1.1 倍", ["T4"]],
    ["物料与彩排", "按清单完成采购与借调", "物料", -10, -5, "high", "物资签收表全部勾选", ["T1"]],
    ["物料与彩排", "音响与投影设备联调", "物料", -3, -2, "high", "试音与投屏各通过一次", ["T6"]],
    ["物料与彩排", "主持人串词与全流程彩排", "节目", -3, -1, "medium", "完整走场一次，记录调整项", ["T2", "T7"]],
    ["现场与复盘", "提前进场布置与签到准备", "现场", 0, 0, "high", "开场前 30 分钟完成签到台布置", ["T7"]],
    ["现场与复盘", "现场流程执行与记录", "现场", 0, 0, "high", "按流程单执行，偏差不超过 10 分钟", ["T8"]],
    ["现场与复盘", "费用对账与票据归档", "财务", 1, 2, "medium", "票据齐全，账实相符", ["T10"]],
    ["现场与复盘", "图文复盘与模板归档", "统筹", 1, 2, "low", "复盘文档与照片归档到共享盘", ["T10", "T11"]],
  ];

  const tasks = taskTemplate.map((row, index) => {
    const [phase, name, role, from, to, priority, acceptance, depends] = row;
    return {
      id: `T${index + 1}`,
      phase,
      name,
      role,
      owner: owner(index + 1),
      collaborators: index % 3 === 0 ? [owner(index + 2), owner(index + 3)] : [],
      start_at: dateOnly(addDays(startsAt, from)),
      due_at: dateOnly(addDays(startsAt, to)),
      priority,
      depends_on: depends,
      acceptance,
      notes: index === 9 ? "现场记录使用统一表格，每 30 分钟记录一次" : "",
    };
  });

  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const task of tasks) byPriority[task.priority] += 1;

  const hashtags = ["校园活动", input.theme.slice(0, 12), typeLabel];

  const promotion = {
    slogan: input.tone === "formal" ? `${input.theme}，如期而至。` : `「${input.theme}」，等你到场。`,
    key_messages: [
      `${monthDay(startsAt)} ${clock(startsAt)}，${input.location}，${people} 人一起参与。`,
      `现场设置${flavor.middle}，参与互动即可获得纪念品。`,
      "扫码进群报名，名额有限，先到先得。",
    ],
    copy: {
      title: `【${input.theme}】${monthDay(startsAt)}，我们不见不散`,
      body: `${monthDay(startsAt)} ${clock(startsAt)}，${input.location}。\n${flavor.opening}、${flavor.middle}、现场抽奖，一次安排。\n无论你是第一次参加，还是已经等了很久，都欢迎来坐坐。`,
      hashtags,
      call_to_action: "点击群接龙报名，或联系负责人林晓（微信同号）。",
    },
    channels: [
      {
        channel: "班级群",
        content: "转发推文 + 群接龙报名，每晚汇总一次名单",
        publish_at: dateOnly(addDays(startsAt, -12)),
        owner: "宣传组 · 陈默",
      },
      {
        channel: "公众号",
        content: "发布完整推文，含流程、奖品与报名入口",
        publish_at: dateOnly(addDays(startsAt, -10)),
        owner: "宣传组 · 周雨",
      },
      {
        channel: "朋友圈",
        content: "海报九宫格 + 一句口号，鼓励转发",
        publish_at: dateOnly(addDays(startsAt, -7)),
        owner: "宣传组 · 李想",
      },
      {
        channel: "线下海报",
        content: "宿舍楼下与食堂门口各张贴 2 张",
        publish_at: dateOnly(addDays(startsAt, -6)),
        owner: "物料组 · 王宁",
      },
    ],
    poster_copy: {
      headline: input.theme,
      subheadline: `${monthDay(startsAt)} ${clock(startsAt)} · ${input.location}`,
      footer: `主办：校学生社团联合会　扫码报名`,
    },
  };

  const riskTemplate = [
    [
      "场地",
      "场地临时被占用或调整",
      "high",
      "medium",
      "收到场地方临时调整通知",
      "活动前 3 天二次确认；优先锁定备选教室",
      "切换到备选场地并同步通知报名者",
    ],
    [
      "设备",
      "音响或话筒现场故障",
      "high",
      "medium",
      "试音时出现啸叫、无声或断连",
      "准备备用话筒与音频线，提前完成联调",
      "立即切换备用设备，主持人先用互动维持节奏",
    ],
    [
      "人员",
      "核心志愿者临时缺席",
      "medium",
      "high",
      "活动前一天确认不到人",
      "每个岗位设置 1 名替补，提前同步流程",
      "由替补顶上，统筹组现场重新分配",
    ],
    [
      "预算",
      "物料价格超出预算",
      "medium",
      "medium",
      "采购报价高于预算单价",
      "优先保留主视觉与音响，压缩周边",
      "压缩奖品与周边，动用预备金",
    ],
    [
      "宣传",
      "报名人数不足",
      "medium",
      "medium",
      "报名截止前仍未达到目标人数",
      "提前一周二次推送，扩大到相邻学院",
      "开放现场报名，并请社团成员协助转发",
    ],
    [
      "安全",
      "人群拥挤或出现身体不适",
      "critical",
      "low",
      "入口拥堵或有人晕倒",
      "设置两个出入口与医疗点，安排疏导人员",
      "立即疏导并联系校医院，同步上报指导老师",
    ],
  ];

  const risks = riskTemplate.map((row, index) => ({
    id: `R${index + 1}`,
    category: row[0],
    description: row[1],
    level: row[2],
    probability: row[3],
    impact: index === 5 ? "可能造成人员受伤或活动中断" : "影响现场节奏或体验",
    trigger: row[4],
    mitigation: row[5],
    contingency: row[6],
    owner: owner(index + 2),
  }));

  const riskSummary = { total: risks.length, high: 0, medium: 0, low: 0 };
  for (const risk of risks) {
    if (risk.level === "high" || risk.level === "critical") riskSummary.high += 1;
    else if (risk.level === "medium") riskSummary.medium += 1;
    else riskSummary.low += 1;
  }

  const warnings = [];
  if (budget / people < 8) {
    warnings.push(`人均预算仅 ¥${round2(budget / people)}，奖品与物料可能需要压缩或寻求赞助。`);
  }
  if (people > 500) {
    warnings.push("参与人数较多，请提前与保卫处报备，并增加签到与疏导人手。");
  }
  if (String(input.constraints || "").includes("明火")) {
    warnings.push("活动限制中提及明火，所有环节已避免使用明火道具，请现场再次确认。");
  }

  const review = {
    kpis: [
      { name: "实际到场率", target: "≥ 90%", method: "签到表 / 报名名单" },
      { name: "参与者满意度", target: "≥ 4.5 / 5", method: "活动后问卷（不少于 30 份）" },
      { name: "预算执行率", target: "≤ 100%", method: "票据与费用对账表" },
      { name: "宣传触达", target: "≥ 800 次阅读", method: "公众号后台 / 群接龙数据" },
    ],
    retro_questions: [
      "实际到场人数与报名人数的差距出现在哪个环节？",
      "哪个环节的时间偏差最大，原因是什么？",
      "预算中哪一项超支或结余最多，下次如何调整？",
      "现场志愿者的人手分配是否合理，哪个岗位最吃紧？",
    ],
    checklist: [
      "签到表、报名名单与实际到场人数已核对",
      "场地、设备已归还并完成交接",
      "物资清单完成清点，剩余物资已入库",
      "票据齐全，费用对账表已完成",
      "现场照片与视频已汇总到共享盘",
      "复盘会议已召开，改进项已分配到人",
    ],
    template_markdown: `# ${input.theme} · 复盘模板

## 一、基本信息
- 时间：${dateOnly(startsAt)} ${clock(startsAt)}
- 地点：${input.location}
- 参与人数：${people} 人（实际到场：____ 人）
- 总支出：¥${planned.toLocaleString("zh-CN")}

## 二、目标回顾
${objectives.map((item) => `- ${item}`).join("\n")}

## 三、做得好
1. 
2. 
3. 

## 四、待改进
1. 
2. 
3. 

## 五、下次行动
- [ ] 提前确认场地与设备
- [ ] 宣传提前两周启动
- [ ] 每个岗位设置替补

> 复盘的原则：对事不对人，把问题写成下一次可以执行的动作。`,
  };

  const assumptions = [
    "场地可在活动前 2 小时交付布置，并允许张贴海报与搭建背景板。",
    "音响、投影与话筒由场地方提供，并在彩排前完成一次联调。",
    input.constraints ? `已按限制条件「${input.constraints}」调整流程与物料。` : "活动不涉及明火、烟花等需要额外审批的道具。",
  ];

  return {
    schema_version: "1.0",
    meta: {
      title,
      theme: input.theme,
      activity_type: input.activity_type,
      activity_type_label: typeLabel,
      participants: people,
      budget_yuan: budget,
      starts_at: isoLocal(startsAt),
      duration_minutes: duration,
      location: input.location,
      generated_at: isoLocal(new Date()),
      agent: { provider: "mock", prompt_version: "1.0.0" },
      degraded: false,
    },
    plan: {
      summary,
      background,
      objectives,
      highlights,
      success_criteria: successCriteria,
      phases,
      rundown,
      budget: {
        currency: "CNY",
        requested_yuan: budget,
        items_total_yuan: itemsTotal,
        contingency_yuan: contingency,
        planned_yuan: planned,
        items,
        funding_sources: funding,
      },
    },
    materials,
    tasks: { items: tasks, summary: { total: tasks.length, by_priority: byPriority } },
    promotion,
    risks: { items: risks, summary: riskSummary },
    review,
    assumptions,
    warnings,
  };
}

function table(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.map((cell) => clean(cell)).join(" | ")} |`).join("\n");
  return [head, divider, body].join("\n");
}

export function buildMarkdown(plan) {
  const content = plan.content;
  if (!content) return "";
  const { plan: core, materials, tasks, promotion, risks, review } = content;
  const lines = [];

  lines.push(`# ${plan.title}`, "", `> ${core.summary}`, "");

  lines.push("## 一、活动概览", "");
  lines.push(
    table(
      ["项目", "内容"],
      [
        ["活动类型", TYPE_LABELS[plan.activity_type] ?? plan.activity_type],
        ["开始时间", plan.starts_at],
        ["活动时长", `${content.meta.duration_minutes} 分钟`],
        ["活动地点", plan.location],
        ["预计规模", `${plan.participants} 人`],
        ["预算", `¥${Number(plan.budget_yuan).toFixed(2)}`],
      ],
    ),
    "",
    "### 活动背景",
    core.background,
    "",
    "### 活动目标",
    core.objectives.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "",
    "### 活动亮点",
    core.highlights.map((item) => `- ${item}`).join("\n"),
    "",
    "### 成功标准",
    core.success_criteria.map((item) => `- ${item}`).join("\n"),
    "",
  );

  lines.push("## 二、筹备阶段", "");
  for (const phase of core.phases) {
    lines.push(
      `### ${phase.name}（${phase.start_date} 至 ${phase.end_date}）`,
      "",
      `目标：${phase.goal}`,
      "",
      `负责人：${phase.owner}`,
      "",
      "关键动作：",
      phase.key_actions.map((item) => `- ${item}`).join("\n"),
      "",
      `交付物：${phase.deliverables.join("、")}`,
      "",
    );
  }

  lines.push(
    "## 三、当晚流程",
    "",
    table(
      ["序号", "时间", "环节", "内容", "负责人", "地点"],
      core.rundown.map((item) => [
        item.seq,
        `${item.start_time}-${item.end_time}`,
        item.segment,
        item.content,
        item.owner,
        item.location,
      ]),
    ),
    "",
  );

  const budget = core.budget;
  lines.push(
    "## 四、预算",
    "",
    table(
      ["类别", "项目", "单位", "数量", "单价（元）", "金额（元）"],
      budget.items.map((item) => [
        item.category,
        item.name,
        item.unit,
        item.quantity,
        item.unit_price_yuan.toFixed(2),
        item.amount_yuan.toFixed(2),
      ]),
    ),
    "",
    `- 明细合计：¥${budget.items_total_yuan.toFixed(2)}`,
    `- 预备金：¥${budget.contingency_yuan.toFixed(2)}`,
    `- 计划合计：¥${budget.planned_yuan.toFixed(2)}`,
    `- 申请预算：¥${budget.requested_yuan.toFixed(2)}`,
    "",
    `经费来源：${budget.funding_sources.map((source) => `${source.name} ¥${source.amount_yuan.toFixed(2)}`).join("；")}`,
    "",
  );

  lines.push(
    "## 五、物资清单",
    "",
    table(
      ["类别", "物资", "规格", "数量", "单价（元）", "小计（元）", "采购渠道", "负责人", "状态"],
      materials.items.map((item) => [
        item.category,
        item.name,
        item.spec,
        `${item.quantity}${item.unit}`,
        item.unit_price_yuan.toFixed(2),
        item.subtotal_yuan.toFixed(2),
        item.purchase_channel,
        item.owner,
        item.status,
      ]),
    ),
    "",
    `共 ${materials.summary.total_items} 项，预计成本 ¥${materials.summary.estimated_cost_yuan.toFixed(2)}。`,
    "",
  );

  lines.push("## 六、任务分工", "");
  const phases = [...new Set(tasks.items.map((item) => item.phase))];
  for (const phase of phases) {
    lines.push(`### ${phase}`, "");
    lines.push(
      table(
        ["任务", "负责人", "角色", "优先级", "截止", "验收标准"],
        tasks.items
          .filter((item) => item.phase === phase)
          .map((item) => [item.name, item.owner, item.role, item.priority, item.due_at, item.acceptance]),
      ),
      "",
    );
  }

  lines.push(
    "## 七、宣传方案",
    "",
    `口号：${promotion.slogan}`,
    "",
    "核心信息：",
    promotion.key_messages.map((item) => `- ${item}`).join("\n"),
    "",
    `### ${promotion.copy.title}`,
    "",
    promotion.copy.body,
    "",
    promotion.copy.hashtags.map((tag) => `#${tag}`).join(" "),
    "",
    promotion.copy.call_to_action,
    "",
    "### 渠道安排",
    "",
    table(
      ["渠道", "内容", "发布时间", "负责人"],
      promotion.channels.map((item) => [item.channel, item.content, item.publish_at, item.owner]),
    ),
    "",
    "### 海报文字",
    "",
    `- 主标题：${promotion.poster_copy.headline}`,
    `- 副标题：${promotion.poster_copy.subheadline}`,
    `- 页脚：${promotion.poster_copy.footer}`,
    "",
  );

  lines.push("## 八、风险与复盘", "", "### 风险清单", "");
  lines.push(
    table(
      ["类别", "风险", "等级", "概率", "缓解措施", "应急预案", "负责人"],
      risks.items.map((item) => [
        item.category,
        item.description,
        item.level,
        item.probability,
        item.mitigation,
        item.contingency,
        item.owner,
      ]),
    ),
    "",
    "### 成效指标",
    "",
    table(
      ["指标", "目标", "评估方式"],
      review.kpis.map((item) => [item.name, item.target, item.method]),
    ),
    "",
    "### 复盘问题",
    review.retro_questions.map((item) => `- ${item}`).join("\n"),
    "",
    "### 复盘清单",
    review.checklist.map((item) => `- [ ] ${item}`).join("\n"),
    "",
    review.template_markdown,
    "",
  );

  if (content.assumptions.length) {
    lines.push("## 附：前提假设", "", content.assumptions.map((item) => `- ${item}`).join("\n"), "");
  }
  if (content.warnings.length) {
    lines.push("## 附：生成警告", "", content.warnings.map((item) => `- ${item}`).join("\n"), "");
  }

  return lines.join("\n");
}
