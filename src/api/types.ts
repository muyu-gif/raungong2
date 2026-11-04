/** 与《04-前端开发文档》第 7 节保持一致的类型定义。 */

export interface User {
  id: string;
  username: string;
  display_name: string;
  role: "user" | "admin";
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  display_name: string;
}

export type ActivityType =
  | "welcome_party"
  | "club_recruitment"
  | "team_building"
  | "lecture"
  | "sports"
  | "arts"
  | "volunteer"
  | "competition"
  | "other";

export type Tone = "lively" | "warm" | "formal" | "creative";

export interface GeneratePlanRequest {
  theme: string;
  activity_type: ActivityType;
  participants: number;
  budget_yuan: number;
  starts_at: string;
  duration_minutes?: number;
  location: string;
  target_audience?: string | null;
  goals?: string[];
  constraints?: string | null;
  tone?: Tone;
  extra_notes?: string | null;
}

export interface GenerateAccepted {
  task_id: string;
  plan_id: string;
  status: "queued";
  reused: boolean;
  estimated_seconds: number;
  poll_after_ms: number;
  poll_url: string;
}

export type TaskStatus = "queued" | "running" | "succeeded" | "failed" | "canceled";

export interface GenerationTask {
  task_id: string;
  plan_id: string;
  type: "generate" | "regenerate";
  section_key: string | null;
  status: TaskStatus;
  stage: string | null;
  progress: number;
  message: string;
  attempt: number;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export type PlanStatus = "draft" | "generating" | "ready" | "failed" | "archived";

export interface PlanListItem {
  id: string;
  title: string;
  theme: string;
  activity_type: ActivityType;
  participants: number;
  budget_yuan: number;
  starts_at: string;
  location: string;
  status: PlanStatus;
  degraded: boolean;
  version: number;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanDetail extends PlanListItem {
  input: GeneratePlanRequest;
  content: PlanContent | null;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_more: boolean;
}

export interface PlanListResponse {
  items: PlanListItem[];
  pagination: Pagination;
}

export interface SectionUpdateRequest<T = unknown> {
  version: number;
  data: T;
  comment?: string;
}

export interface SectionUpdateResponse<T = unknown> {
  plan_id: string;
  section_key: string;
  version: number;
  data: T;
  updated_at: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

/* ---------------------------- 方案内容 ---------------------------- */

export interface PlanContent {
  schema_version: string;
  meta: PlanMeta;
  plan: PlanSection;
  materials: MaterialsSection;
  tasks: TasksSection;
  promotion: PromotionSection;
  risks: RisksSection;
  review: ReviewSection;
  assumptions: string[];
  warnings: string[];
}

export interface PlanMeta {
  title: string;
  theme: string;
  activity_type: ActivityType;
  activity_type_label: string;
  participants: number;
  budget_yuan: number;
  starts_at: string;
  duration_minutes: number;
  location: string;
  generated_at: string;
  agent: {
    provider: string;
    prompt_version: string;
  };
  degraded: boolean;
}

export interface PlanSection {
  summary: string;
  background: string;
  objectives: string[];
  highlights: string[];
  success_criteria: string[];
  phases: Phase[];
  rundown: RundownItem[];
  budget: Budget;
}

export interface Phase {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal: string;
  key_actions: string[];
  owner: string;
  deliverables: string[];
}

export interface RundownItem {
  seq: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  segment: string;
  content: string;
  owner: string;
  location: string;
  notes: string;
}

export interface Budget {
  currency: string;
  requested_yuan: number;
  items_total_yuan: number;
  contingency_yuan: number;
  planned_yuan: number;
  items: BudgetItem[];
  funding_sources: FundingSource[];
}

export interface BudgetItem {
  id: string;
  category: string;
  name: string;
  unit: string;
  quantity: number;
  unit_price_yuan: number;
  amount_yuan: number;
  note: string;
}

export interface FundingSource {
  name: string;
  amount_yuan: number;
}

export interface MaterialsSection {
  items: MaterialItem[];
  summary: {
    total_items: number;
    total_quantity: number;
    estimated_cost_yuan: number;
  };
}

export interface MaterialItem {
  id: string;
  category: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
  unit_price_yuan: number;
  subtotal_yuan: number;
  purchase_channel: string;
  owner: string;
  needed_by: string;
  status: "pending" | "purchased" | "borrowed" | "ready";
  note: string;
}

export interface TasksSection {
  items: TaskItem[];
  summary: {
    total: number;
    by_priority: {
      high: number;
      medium: number;
      low: number;
    };
  };
}

export interface TaskItem {
  id: string;
  phase: string;
  name: string;
  role: string;
  owner: string;
  collaborators: string[];
  start_at: string;
  due_at: string;
  priority: "low" | "medium" | "high";
  depends_on: string[];
  acceptance: string;
  notes: string;
}

export interface PromotionSection {
  slogan: string;
  key_messages: string[];
  copy: {
    title: string;
    body: string;
    hashtags: string[];
    call_to_action: string;
  };
  channels: PromotionChannel[];
  poster_copy: {
    headline: string;
    subheadline: string;
    footer: string;
  };
}

export interface PromotionChannel {
  channel: string;
  content: string;
  publish_at: string;
  owner: string;
}

export interface RisksSection {
  items: RiskItem[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface RiskItem {
  id: string;
  category: string;
  description: string;
  level: "low" | "medium" | "high" | "critical";
  probability: "low" | "medium" | "high";
  impact: string;
  trigger: string;
  mitigation: string;
  contingency: string;
  owner: string;
}

export interface ReviewSection {
  kpis: {
    name: string;
    target: string;
    method: string;
  }[];
  retro_questions: string[];
  checklist: string[];
  template_markdown: string;
}

export type EditableSectionKey = "plan" | "materials" | "tasks" | "promotion" | "risks" | "review";
