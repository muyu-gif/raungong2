const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/**
 * SQLite 返回的时间可能不带时区（例如 2026-11-09T19:00:00），
 * 按本地时间解析；同时兼容 6 位微秒（JS 只认 3 位）。
 */
export function parseServerDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  let text = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) text = `${text}T00:00:00`;
  text = text.replace(/(\.\d{3})\d+/, "$1");
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function formatDateTime(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "时间待定";
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${WEEKDAYS[date.getDay()]} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function formatDate(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "待定";
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function formatTime(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "--:--";
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  const from = parseServerDate(start);
  const to = parseServerDate(end);
  if (!from || !to) return "日期待定";
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = sameYear
    ? `${pad(from.getMonth() + 1)}.${pad(from.getDate())}`
    : `${from.getFullYear()}.${pad(from.getMonth() + 1)}.${pad(from.getDate())}`;
  return `${left} — ${pad(to.getMonth() + 1)}.${pad(to.getDate())}`;
}

export function formatDateTimeInput(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:00`;
}

export function formatMoney(value: number | null | undefined, withSymbol = true): string {
  const amount = Number(value ?? 0);
  const safe = Number.isFinite(amount) ? amount : 0;
  const text = safe.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `¥ ${text}` : text;
}

export function formatInteger(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("zh-CN");
}

export function formatNumber(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

export function formatDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  if (!total) return "时长待定";
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours && rest) return `${hours} 小时 ${rest} 分`;
  if (hours) return `${hours} 小时`;
  return `${rest} 分钟`;
}

export function formatShortDuration(minutes: number | null | undefined): string {
  const total = Math.max(0, Math.round(Number(minutes ?? 0)));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!total) return "—";
  if (hours && rest) return `${hours}h${pad(rest)}`;
  if (hours) return `${hours}h`;
  return `${rest}min`;
}

export function formatElapsed(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(safe / 60))}:${pad(safe % 60)}`;
}

export function formatRelative(value: string | null | undefined): string {
  const date = parseServerDate(value);
  if (!date) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return formatDateTime(value);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "刚刚";
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 2 * day) return "昨天";
  return formatDate(value);
}

export function toNumber(value: unknown, fallback = 0): number {
  const number = typeof value === "number" ? value : Number.parseFloat(String(value));
  return Number.isFinite(number) ? number : fallback;
}

export function roundMoney(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function toIsoString(value: Date): string {
  return new Date(value).toISOString();
}

export function formatMultiplier(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  return value.toFixed(2);
}
