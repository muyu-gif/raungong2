import type { AxiosError } from "axios";

/**
 * 后端没有统一 error 包装，可能返回：
 * 1. { detail: "字符串" }
 * 2. { detail: { code, message, ... } }
 * 3. { detail: [{ loc, msg, ... }] }  (422)
 */
export function getErrorMessage(error: unknown): string {
  const err = error as AxiosError<{ detail?: unknown }>;
  const detail = err?.response?.data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const text = detail
      .map((item) => {
        const entry = item as { loc?: unknown[]; msg?: string };
        const loc = Array.isArray(entry.loc)
          ? entry.loc.filter((part) => part !== "body" && part !== "query").join(".")
          : "";
        return loc ? `${loc}：${entry.msg ?? ""}` : (entry.msg ?? "");
      })
      .filter(Boolean)
      .join("；");
    if (text) return text;
  }

  if (detail && typeof detail === "object" && "message" in detail) {
    const message = (detail as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }

  const status = err?.response?.status;
  if (status === 401) return "登录状态已失效，请重新登录";
  if (status === 403) return "没有权限执行此操作";
  if (status === 404) return "数据不存在，或不属于当前账号";
  if (status === 409) return "数据已被修改，请刷新后重试";
  if (status === 422) return "提交的数据不符合要求，请检查后重试";
  if (status && status >= 500) return "服务器内部错误，请稍后重试";

  if (err?.code === "ECONNABORTED") return "请求超时，请检查后端服务后重试";
  if (err?.code === "ERR_NETWORK") return "无法连接后端服务，请确认服务已启动";

  return "请求失败，请稍后重试";
}

export function isVersionConflict(error: unknown): boolean {
  const err = error as AxiosError<{ detail?: { code?: string } }>;
  return err?.response?.status === 409 && err?.response?.data?.detail?.code === "VERSION_CONFLICT";
}

export function isNotReady(error: unknown): boolean {
  const err = error as AxiosError<{ detail?: unknown }>;
  return err?.response?.status === 409 && typeof err?.response?.data?.detail === "string";
}

export function isNetworkError(error: unknown): boolean {
  const err = error as AxiosError;
  return !err?.response || err.code === "ERR_NETWORK" || err.code === "ECONNABORTED";
}

/** 导出接口用 responseType: "blob"，错误体也是 Blob，需要先读成文本再解析 detail。 */
export async function getBlobErrorMessage(error: unknown): Promise<string> {
  const err = error as AxiosError<unknown>;
  const data = err?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text) as { detail?: unknown };
      return getErrorMessage({ response: { data: parsed, status: err.response?.status } });
    } catch {
      return getErrorMessage(error);
    }
  }
  return getErrorMessage(error);
}
