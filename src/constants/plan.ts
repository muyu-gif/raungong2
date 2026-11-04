import type { EditableSectionKey, PlanStatus } from "@/api/types";

export const PLAN_STATUS_META: Record<
  PlanStatus,
  { label: string; tone: "ready" | "progress" | "danger" | "muted" }
> = {
  ready: { label: "可查看", tone: "ready" },
  generating: { label: "生成中", tone: "progress" },
  failed: { label: "生成失败", tone: "danger" },
  draft: { label: "草稿", tone: "muted" },
  archived: { label: "已归档", tone: "muted" },
};

export const SECTION_LABELS: Record<EditableSectionKey, string> = {
  plan: "策划正文",
  materials: "物资",
  tasks: "分工",
  promotion: "宣传",
  risks: "风险",
  review: "复盘",
};

export const MATERIAL_STATUS: Record<
  string,
  { label: string; tone: "ready" | "progress" | "muted" | "danger" }
> = {
  pending: { label: "待采购", tone: "progress" },
  purchased: { label: "已采购", tone: "ready" },
  borrowed: { label: "已借调", tone: "muted" },
  ready: { label: "已就位", tone: "ready" },
};

export const PRIORITY_META: Record<string, { label: string; tone: "ready" | "progress" | "muted" | "danger" }> = {
  high: { label: "高", tone: "danger" },
  medium: { label: "中", tone: "progress" },
  low: { label: "低", tone: "muted" },
};

export const RISK_LEVEL_META: Record<
  string,
  { label: string; tone: "ready" | "progress" | "muted" | "danger" }
> = {
  critical: { label: "严重", tone: "danger" },
  high: { label: "高", tone: "danger" },
  medium: { label: "中", tone: "progress" },
  low: { label: "低", tone: "muted" },
};

export const PROBABILITY_LABELS: Record<string, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

export type StageStep = {
  key: "queued" | "planning" | "done";
  label: string;
  description: string;
};

export const GENERATION_STEPS: StageStep[] = [
  { key: "queued", label: "已排队", description: "任务已进入队列，等待开始" },
  { key: "planning", label: "正在生成策划案", description: "整理活动目标、流程与预算" },
  { key: "done", label: "生成完成", description: "六部分内容已写入方案" },
];

export function stageText(stage: string | null | undefined, status?: string): string {
  if (stage === "planning") return "正在生成策划案";
  if (stage === "done") return "生成完成";
  if (!stage) return status === "queued" ? "已排队" : "处理中";
  return "处理中";
}
