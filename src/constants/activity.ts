import type { ActivityType, Tone } from "@/api/types";

export const ACTIVITY_TYPES = [
  { value: "welcome_party", label: "迎新晚会", en: "WELCOME PARTY" },
  { value: "club_recruitment", label: "社团招新", en: "CLUB RECRUITMENT" },
  { value: "team_building", label: "团建 / 破冰", en: "TEAM BUILDING" },
  { value: "lecture", label: "讲座 / 分享会", en: "LECTURE" },
  { value: "sports", label: "体育比赛", en: "SPORTS" },
  { value: "arts", label: "文艺比赛", en: "ARTS" },
  { value: "volunteer", label: "志愿服务", en: "VOLUNTEER" },
  { value: "competition", label: "学科竞赛", en: "COMPETITION" },
  { value: "other", label: "其他活动", en: "OTHER" },
] as const satisfies ReadonlyArray<{ value: ActivityType; label: string; en: string }>;

export const ACTIVITY_LABELS: Record<ActivityType, string> = Object.fromEntries(
  ACTIVITY_TYPES.map((item) => [item.value, item.label]),
) as Record<ActivityType, string>;

export function activityLabel(value: string | null | undefined): string {
  if (!value) return "未分类";
  return ACTIVITY_LABELS[value as ActivityType] ?? value;
}

export const TONES = [
  { value: "lively", label: "轻松活泼", hint: "适合晚会、团建、招新" },
  { value: "warm", label: "温馨走心", hint: "适合纪念、志愿、分享" },
  { value: "formal", label: "正式庄重", hint: "适合讲座、典礼、竞赛" },
  { value: "creative", label: "创意跳脱", hint: "适合文化节、创意活动" },
] as const satisfies ReadonlyArray<{ value: Tone; label: string; hint: string }>;

export const TONE_LABELS: Record<Tone, string> = {
  lively: "轻松活泼",
  warm: "温馨走心",
  formal: "正式庄重",
  creative: "创意跳脱",
};
