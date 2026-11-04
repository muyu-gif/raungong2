ACTIVITY_TYPES = [
    ("welcome_party", "迎新晚会"),
    ("club_recruitment", "社团招新"),
    ("team_building", "团建/破冰"),
    ("lecture", "讲座/分享会"),
    ("sports", "体育比赛/运动会"),
    ("arts", "文艺比赛/文化节"),
    ("volunteer", "志愿服务"),
    ("competition", "学科竞赛"),
    ("other", "其他"),
]
ACTIVITY_TYPE_LABELS = dict(ACTIVITY_TYPES)

PLAN_STATUSES = [
    ("draft", "草稿"),
    ("generating", "生成中"),
    ("ready", "可用"),
    ("failed", "生成失败"),
    ("archived", "已归档"),
]

TASK_STATUSES = [
    ("queued", "排队中"),
    ("running", "生成中"),
    ("succeeded", "已完成"),
    ("failed", "失败"),
    ("canceled", "已取消"),
]

SECTIONS = [
    ("plan", "策划案"),
    ("materials", "物资清单"),
    ("tasks", "分工表"),
    ("promotion", "宣传文案"),
    ("risks", "风险清单"),
    ("review", "复盘模板"),
]

RISK_LEVELS = [
    ("low", "低"),
    ("medium", "中"),
    ("high", "高"),
    ("critical", "极高"),
]

TASK_PRIORITIES = [
    ("low", "低"),
    ("medium", "中"),
    ("high", "高"),
]

TONES = [
    ("lively", "青春热烈"),
    ("warm", "温馨"),
    ("formal", "正式"),
    ("creative", "创意"),
]


def activity_type_label(value: str) -> str:
    return ACTIVITY_TYPE_LABELS.get(value, value)
