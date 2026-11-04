import type { GeneratePlanRequest } from "@/api/types";

/**
 * 当前后端 GET /plans/{id} 不返回 latest_task，
 * 因此生成中的 task_id 必须由前端自己保存在 sessionStorage。
 */
export const taskStorageKey = (planId: string) => `plan-task:${planId}`;
export const draftStorageKey = (planId: string) => `plan-draft:${planId}`;
export const createDraftKey = "create-draft";

export function saveTaskId(planId: string, taskId: string): void {
  try {
    sessionStorage.setItem(taskStorageKey(planId), taskId);
  } catch {
    /* noop */
  }
}

export function readTaskId(planId: string): string | null {
  try {
    return sessionStorage.getItem(taskStorageKey(planId));
  } catch {
    return null;
  }
}

export function clearTaskId(planId: string): void {
  try {
    sessionStorage.removeItem(taskStorageKey(planId));
  } catch {
    /* noop */
  }
}

export function saveGenerationDraft(planId: string, payload: GeneratePlanRequest): void {
  try {
    sessionStorage.setItem(draftStorageKey(planId), JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

export function clearGenerationDraft(planId: string): void {
  try {
    sessionStorage.removeItem(draftStorageKey(planId));
  } catch {
    /* noop */
  }
}

export function readGenerationDraft(planId: string): GeneratePlanRequest | null {
  try {
    const raw = sessionStorage.getItem(draftStorageKey(planId));
    return raw ? (JSON.parse(raw) as GeneratePlanRequest) : null;
  } catch {
    return null;
  }
}

export function stashCreateDraft(payload: GeneratePlanRequest): void {
  try {
    sessionStorage.setItem(createDraftKey, JSON.stringify(payload));
  } catch {
    /* noop */
  }
}

export function takeCreateDraft(): GeneratePlanRequest | null {
  try {
    const raw = sessionStorage.getItem(createDraftKey);
    if (!raw) return null;
    sessionStorage.removeItem(createDraftKey);
    return JSON.parse(raw) as GeneratePlanRequest;
  } catch {
    return null;
  }
}
