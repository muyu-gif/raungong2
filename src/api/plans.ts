import { api } from "@/api/client";
import type {
  EditableSectionKey,
  GenerateAccepted,
  GeneratePlanRequest,
  GenerationTask,
  PlanDetail,
  PlanListResponse,
  SectionUpdateResponse,
} from "@/api/types";

export interface PlanListParams {
  page?: number;
  page_size?: number;
  keyword?: string;
}

export async function listPlans(params: PlanListParams) {
  const { data } = await api.get<PlanListResponse>("/api/v1/plans", {
    // 当前后端只支持 page / page_size / keyword，不要发送其它参数。
    params: {
      page: params.page ?? 1,
      page_size: params.page_size ?? 20,
      ...(params.keyword ? { keyword: params.keyword } : {}),
    },
  });
  return data;
}

export async function getPlan(planId: string) {
  const { data } = await api.get<PlanDetail>(`/api/v1/plans/${planId}`);
  return data;
}

export async function generatePlan(payload: GeneratePlanRequest, idempotencyKey: string) {
  const { data } = await api.post<GenerateAccepted>("/api/v1/plans/generate", payload, {
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return data;
}

export async function getTask(taskId: string) {
  const { data } = await api.get<GenerationTask>(`/api/v1/tasks/${taskId}`);
  return data;
}

export async function updateSection<T>(
  planId: string,
  sectionKey: EditableSectionKey,
  data: T,
  version: number,
  comment = "手动编辑",
) {
  const { data: response } = await api.patch<SectionUpdateResponse<T>>(
    `/api/v1/plans/${planId}/sections/${sectionKey}`,
    { version, data, comment },
  );
  return response;
}

export async function exportPlanMarkdown(planId: string) {
  const response = await api.get<Blob>(`/api/v1/plans/${planId}/export`, {
    params: { format: "markdown" },
    responseType: "blob",
    timeout: 30000,
  });
  return response;
}
