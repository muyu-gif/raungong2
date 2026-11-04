import type { GeneratePlanRequest, PlanSection } from "@/api/types";
import { ACTIVITY_TYPES } from "@/constants/activity";
import { toNumber } from "@/utils/format";

export type FormState = {
  theme: string;
  activityType: string;
  participants: string;
  budget: string;
  startsAt: Date | null;
  duration: string;
  location: string;
  targetAudience: string;
  goals: string[];
  tone: string;
  constraints: string;
  extraNotes: string;
};

export function nextWeekEvening(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  date.setHours(19, 0, 0, 0);
  return date;
}

export function emptyForm(): FormState {
  return {
    theme: "",
    activityType: "",
    participants: "100",
    budget: "2000",
    startsAt: nextWeekEvening(),
    duration: "120",
    location: "",
    targetAudience: "",
    goals: [""],
    tone: "lively",
    constraints: "",
    extraNotes: "",
  };
}

const VALID_TYPES = new Set<string>(ACTIVITY_TYPES.map((item) => item.value));
const VALID_TONES = new Set(["lively", "warm", "formal", "creative"]);

export function formFromPayload(payload: GeneratePlanRequest | null): FormState {
  const base = emptyForm();
  if (!payload) return base;
  const startsAt = payload.starts_at ? new Date(payload.starts_at) : null;
  return {
    theme: payload.theme ?? "",
    activityType: VALID_TYPES.has(payload.activity_type) ? payload.activity_type : "",
    participants: String(payload.participants ?? base.participants),
    budget: String(payload.budget_yuan ?? base.budget),
    startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt : base.startsAt,
    duration: String(payload.duration_minutes ?? 120),
    location: payload.location ?? "",
    targetAudience: payload.target_audience ?? "",
    goals: payload.goals?.length ? [...payload.goals] : [""],
    tone: VALID_TONES.has(payload.tone ?? "") ? String(payload.tone) : "lively",
    constraints: payload.constraints ?? "",
    extraNotes: payload.extra_notes ?? "",
  };
}

export function buildPayload(form: FormState): GeneratePlanRequest {
  const payload: GeneratePlanRequest = {
    theme: form.theme.trim(),
    activity_type: form.activityType as GeneratePlanRequest["activity_type"],
    participants: Number.parseInt(form.participants, 10),
    budget_yuan: Number.parseFloat(form.budget),
    starts_at: new Date(form.startsAt ?? new Date()).toISOString(),
    duration_minutes: Number.parseInt(form.duration, 10),
    location: form.location.trim(),
    tone: form.tone as GeneratePlanRequest["tone"],
  };

  const audience = form.targetAudience.trim();
  if (audience) payload.target_audience = audience;

  const goals = form.goals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length) payload.goals = goals.slice(0, 5);

  const constraints = form.constraints.trim();
  if (constraints) payload.constraints = constraints;

  const notes = form.extraNotes.trim();
  if (notes) payload.extra_notes = notes;

  return payload;
}

export type FormErrors = Partial<Record<keyof FormState, string>>;

export function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};

  const theme = form.theme.trim();
  if (!theme) errors.theme = "请填写活动主题";
  else if (theme.length < 2 || theme.length > 60) errors.theme = "主题需为 2 ～ 60 个字";

  if (!VALID_TYPES.has(form.activityType)) errors.activityType = "请选择活动类型";

  const participantsText = String(form.participants ?? "").trim();
  const participants = Number(participantsText);
  if (!participantsText) errors.participants = "请填写预计人数";
  else if (!Number.isInteger(participants) || participants < 10 || participants > 2000)
    errors.participants = "人数需为 10 ～ 2000 的整数";

  const budgetText = String(form.budget ?? "").trim();
  const budget = Number(budgetText);
  if (!budgetText) errors.budget = "请填写预算金额";
  else if (!/^\d+(\.\d{1,2})?$/.test(budgetText)) errors.budget = "金额最多两位小数";
  else if (budget < 0 || budget > 1000000) errors.budget = "预算需在 0 ～ 1,000,000 元之间";

  if (!form.startsAt) errors.startsAt = "请选择开始时间";
  else if (new Date(form.startsAt).getTime() <= Date.now()) errors.startsAt = "开始时间需晚于当前时间";

  const durationText = String(form.duration ?? "").trim();
  const duration = Number(durationText);
  if (!durationText) errors.duration = "请填写活动时长";
  else if (!Number.isInteger(duration) || duration < 30 || duration > 480)
    errors.duration = "时长需为 30 ～ 480 分钟的整数";

  const location = form.location.trim();
  if (!location) errors.location = "请填写活动地点";
  else if (location.length > 120) errors.location = "地点最多 120 个字";

  if (form.targetAudience.trim().length > 120) errors.targetAudience = "目标人群最多 120 个字";

  const goals = form.goals.map((goal) => goal.trim()).filter(Boolean);
  if (goals.length > 5) errors.goals = "活动目标最多 5 条";
  else if (goals.some((goal) => goal.length > 60)) errors.goals = "单条目标最多 60 个字";

  if (form.constraints.trim().length > 500) errors.constraints = "限制条件最多 500 个字";
  if (form.extraNotes.trim().length > 500) errors.extraNotes = "补充说明最多 500 个字";
  return errors;
}

export function perPersonBudget(form: FormState): number {
  const budget = Number(form.budget);
  const people = Number(form.participants);
  if (!Number.isFinite(budget) || !Number.isFinite(people) || people <= 0) return 0;
  return budget / people;
}

/** 预算编辑：与后端一致地重算金额，仅用于保存前预览。 */
export function recalcBudgetDraft(plan: PlanSection): PlanSection {
  const budget = plan.budget;
  const items = budget.items.map((item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price_yuan);
    return {
      ...item,
      quantity,
      unit_price_yuan: unitPrice,
      amount_yuan: Math.round(quantity * unitPrice * 100) / 100,
    };
  });
  const itemsTotal = Math.round(items.reduce((sum, item) => sum + toNumber(item.amount_yuan), 0) * 100) / 100;
  const contingency = toNumber(budget.contingency_yuan);
  return {
    ...plan,
    budget: {
      ...budget,
      items,
      items_total_yuan: itemsTotal,
      planned_yuan: Math.round((itemsTotal + contingency) * 100) / 100,
    },
  };
}
