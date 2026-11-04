import type {
  EditableSectionKey,
  MaterialsSection,
  PlanSection,
  RisksSection,
  TasksSection,
} from "@/api/types";
import { recalcBudgetDraft } from "@/utils/form";
import { roundMoney, toNumber } from "@/utils/format";

/**
 * 后端对 section.data 只做 dict 接收，不逐字段校验。
 * 保存前由前端保证数字字段是数字、数组字段是数组、汇总与明细一致。
 */
export function normalizeSection<K extends EditableSectionKey>(key: K, input: unknown): unknown {
  switch (key) {
    case "plan":
      return normalizePlan(input as PlanSection);
    case "materials":
      return normalizeMaterials(input as MaterialsSection);
    case "tasks":
      return normalizeTasks(input as TasksSection);
    case "risks":
      return normalizeRisks(input as RisksSection);
    default:
      return input;
  }
}

function normalizePlan(input: PlanSection): PlanSection {
  const plan = recalcBudgetDraft(input);
  return {
    ...plan,
    objectives: Array.isArray(plan.objectives) ? plan.objectives.filter(Boolean) : [],
    highlights: Array.isArray(plan.highlights) ? plan.highlights.filter(Boolean) : [],
    success_criteria: Array.isArray(plan.success_criteria) ? plan.success_criteria.filter(Boolean) : [],
    phases: Array.isArray(plan.phases) ? plan.phases : [],
    rundown: Array.isArray(plan.rundown) ? plan.rundown : [],
    budget: {
      ...plan.budget,
      requested_yuan: toNumber(plan.budget.requested_yuan),
      items_total_yuan: toNumber(plan.budget.items_total_yuan),
      contingency_yuan: toNumber(plan.budget.contingency_yuan),
      planned_yuan: toNumber(plan.budget.planned_yuan),
      items: plan.budget.items.map((item) => ({
        ...item,
        quantity: toNumber(item.quantity),
        unit_price_yuan: toNumber(item.unit_price_yuan),
        amount_yuan: toNumber(item.amount_yuan),
      })),
      funding_sources: (plan.budget.funding_sources ?? []).map((source) => ({
        ...source,
        amount_yuan: toNumber(source.amount_yuan),
      })),
    },
  } as PlanSection;
}

function normalizeMaterials(input: MaterialsSection): MaterialsSection {
  const items = (input.items ?? []).map((item) => {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price_yuan);
    return {
      ...item,
      quantity,
      unit_price_yuan: unitPrice,
      subtotal_yuan: roundMoney(quantity * unitPrice),
    };
  });

  return {
    ...input,
    items,
    summary: {
      total_items: items.length,
      total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      estimated_cost_yuan: roundMoney(items.reduce((sum, item) => sum + item.subtotal_yuan, 0)),
    },
  };
}

function normalizeTasks(input: TasksSection): TasksSection {
  const items = (input.items ?? []).map((item) => ({
    ...item,
    collaborators: Array.isArray(item.collaborators) ? item.collaborators : [],
    depends_on: Array.isArray(item.depends_on) ? item.depends_on : [],
  }));
  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const item of items) {
    if (item.priority === "high" || item.priority === "medium" || item.priority === "low") {
      byPriority[item.priority] += 1;
    }
  }
  return { ...input, items, summary: { total: items.length, by_priority: byPriority } };
}

function normalizeRisks(input: RisksSection): RisksSection {
  const items = (input.items ?? []).map((item) => ({
    ...item,
    level: item.level ?? "medium",
    probability: item.probability ?? "medium",
  }));
  const summary = { total: items.length, high: 0, medium: 0, low: 0 };
  for (const item of items) {
    if (item.level === "high" || item.level === "critical") summary.high += 1;
    else if (item.level === "medium") summary.medium += 1;
    else summary.low += 1;
  }
  return { ...input, items, summary };
}
