<script setup lang="ts">
import { computed } from "vue";
import type { RiskItem, RisksSection } from "@/api/types";
import { PROBABILITY_LABELS, RISK_LEVEL_META } from "@/constants/plan";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: RisksSection;
  draft: RisksSection;
  editing: boolean;
}>();

const risks = computed(() => (props.editing ? props.draft.items : props.data.items));

const summary = computed(() => {
  if (!props.editing) return props.data.summary;
  const next = { total: props.draft.items.length, high: 0, medium: 0, low: 0 };
  for (const item of props.draft.items) {
    if (item.level === "high" || item.level === "critical") next.high += 1;
    else if (item.level === "medium") next.medium += 1;
    else next.low += 1;
  }
  return next;
});

function levelMeta(value: string) {
  return RISK_LEVEL_META[value] ?? { label: value || "—", tone: "muted" as const };
}

function addRisk() {
  props.draft.items.push({
    id: `R${Date.now()}`,
    category: "其他",
    description: "",
    level: "medium",
    probability: "medium",
    impact: "",
    trigger: "",
    mitigation: "",
    contingency: "",
    owner: "",
  });
}

function removeRisk(index: number) {
  if (props.draft.items.length <= 1) return;
  props.draft.items.splice(index, 1);
}

const levelOptions: Array<{ value: RiskItem["level"]; label: string }> = [
  { value: "critical", label: "严重" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];
</script>

<template>
  <div class="risks">
    <div class="summary">
      <span class="sum-label">风险概览</span>
      <span class="sum-item"><strong>{{ summary.total }}</strong> 条</span>
      <span class="sum-item sum-item--high"><strong>{{ summary.high }}</strong> 高</span>
      <span class="sum-item sum-item--medium"><strong>{{ summary.medium }}</strong> 中</span>
      <span class="sum-item sum-item--low"><strong>{{ summary.low }}</strong> 低</span>
    </div>

    <div class="risk-list">
      <article v-for="(risk, index) in risks" :key="risk.id || index" class="risk" :class="`risk--${risk.level}`">
        <template v-if="!editing">
          <header class="risk-head">
            <div class="risk-title">
              <span class="level" :class="`level--${risk.level}`">{{ levelMeta(risk.level).label }}</span>
              <h3>{{ risk.category }}</h3>
              <span class="prob">发生概率 {{ PROBABILITY_LABELS[risk.probability] ?? risk.probability }}</span>
            </div>
            <span class="owner">负责人 · {{ risk.owner || "待定" }}</span>
          </header>

          <p class="desc">{{ risk.description }}</p>

          <div class="risk-grid">
            <div>
              <h4>影响</h4>
              <p>{{ risk.impact || "—" }}</p>
            </div>
            <div>
              <h4>触发信号</h4>
              <p>{{ risk.trigger || "—" }}</p>
            </div>
            <div>
              <h4>缓解措施</h4>
              <p>{{ risk.mitigation || "—" }}</p>
            </div>
            <div>
              <h4>应急预案</h4>
              <p>{{ risk.contingency || "—" }}</p>
            </div>
          </div>
        </template>

        <template v-else>
          <header class="risk-head risk-head--edit">
            <div class="edit-row">
              <input v-model="risk.category" class="cell-input category-input" type="text" maxlength="20" placeholder="风险类别" />
              <select v-model="risk.level" class="cell-select">
                <option v-for="option in levelOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
              <select v-model="risk.probability" class="cell-select">
                <option value="low">概率低</option>
                <option value="medium">概率中</option>
                <option value="high">概率高</option>
              </select>
              <input v-model="risk.owner" class="cell-input" type="text" maxlength="20" placeholder="负责人" />
            </div>
            <button
              type="button"
              class="row-remove"
              aria-label="删除这条风险"
              :disabled="draft.items.length <= 1"
              @click="removeRisk(index)"
            >
              <AppIcon name="close" :size="12" />
            </button>
          </header>

          <div class="field">
            <label class="field-label" :for="`risk-desc-${index}`"><span>风险描述</span></label>
            <textarea :id="`risk-desc-${index}`" v-model="risk.description" class="textarea" rows="2" maxlength="300" />
          </div>

          <div class="risk-edit-grid">
            <div class="field">
              <label class="field-label" :for="`risk-impact-${index}`"><span>影响</span></label>
              <textarea :id="`risk-impact-${index}`" v-model="risk.impact" class="textarea" rows="3" maxlength="200" />
            </div>
            <div class="field">
              <label class="field-label" :for="`risk-trigger-${index}`"><span>触发信号</span></label>
              <textarea :id="`risk-trigger-${index}`" v-model="risk.trigger" class="textarea" rows="3" maxlength="200" />
            </div>
            <div class="field">
              <label class="field-label" :for="`risk-mitigation-${index}`"><span>缓解措施</span></label>
              <textarea :id="`risk-mitigation-${index}`" v-model="risk.mitigation" class="textarea" rows="3" maxlength="300" />
            </div>
            <div class="field">
              <label class="field-label" :for="`risk-contingency-${index}`"><span>应急预案</span></label>
              <textarea :id="`risk-contingency-${index}`" v-model="risk.contingency" class="textarea" rows="3" maxlength="300" />
            </div>
          </div>
        </template>
      </article>
    </div>

    <div v-if="editing" class="table-actions">
      <button type="button" class="add-line" @click="addRisk">
        <AppIcon name="plus" :size="13" />
        <span>添加一条风险</span>
      </button>
      <p class="edit-note">保存后由服务端整体替换本节，风险汇总按等级重算。</p>
    </div>
  </div>
</template>

<style scoped>
.risks {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 20px;
  padding: 12px 0;
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.sum-label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.sum-item {
  font-size: 11.5px;
  color: var(--muted);
}

.sum-item strong {
  margin-right: 4px;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--ink);
}

.sum-item--high strong {
  color: var(--danger);
}

.sum-item--medium strong {
  color: var(--amber);
}

.sum-item--low strong {
  color: var(--green);
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk {
  padding: 18px 20px 16px;
  border: 1px solid var(--rule);
  border-left: 2px solid var(--rule-strong);
  background: rgba(253, 251, 246, 0.5);
}

.risk--critical,
.risk--high {
  border-left-color: var(--danger);
}

.risk--medium {
  border-left-color: var(--amber);
}

.risk--low {
  border-left-color: var(--green);
}

.risk-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.risk-title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px;
}

.level {
  padding: 1px 7px;
  border: 1px solid currentColor;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--muted);
}

.level--critical,
.level--high {
  color: var(--danger);
}

.level--medium {
  color: var(--amber);
}

.level--low {
  color: var(--green);
}

.risk-title h3 {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
}

.prob {
  font-size: 10px;
  color: var(--faint);
}

.owner {
  font-size: 10px;
  color: var(--faint);
  white-space: nowrap;
}

.desc {
  margin-top: 8px;
  font-size: 12.5px;
  line-height: 1.85;
  color: var(--ink-soft);
}

.risk-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dotted var(--rule);
}

.risk-grid h4 {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.risk-grid p {
  margin-top: 5px;
  font-size: 11.5px;
  line-height: 1.8;
  color: var(--muted);
}

.risk-head--edit {
  align-items: flex-start;
  padding-bottom: 12px;
  border-bottom: 1px dotted var(--rule);
  margin-bottom: 14px;
}

.edit-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.category-input {
  width: 140px;
  font-family: var(--font-serif);
  font-size: 14px;
}

.risk-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 14px;
}

.risk-edit-grid .textarea {
  min-height: 80px;
  font-size: 12.5px;
}

.risk .field + .field {
  margin-top: 12px;
}

.risk-head .field {
  margin: 0;
}

.row-remove {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  flex: none;
  color: var(--faint);
  border: 1px solid transparent;
}

.row-remove:hover:not(:disabled) {
  color: var(--danger);
  border-color: var(--rule);
}

.row-remove:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.table-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 20px;
}

.add-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-size: 11.5px;
  color: var(--accent);
}

.add-line:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.edit-note {
  font-size: 10.5px;
  color: var(--faint);
}

@media (max-width: 900px) {
  .risk-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .risk-grid,
  .risk-edit-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .risk-head {
    flex-direction: column;
    gap: 6px;
  }

  .risk-head--edit {
    flex-direction: row;
  }
}
.summary {
  padding: 12px 14px;
  border: 1.5px solid var(--rule);
  border-radius: 16px;
  background: var(--pink-soft);
}

.risk {
  border: 1.5px solid var(--rule);
  border-left: 4px solid var(--rule-strong);
  border-radius: 18px;
  background: #fff;
}

.risk--critical,
.risk--high {
  border-left-color: var(--danger);
}

.risk--medium {
  border-left-color: var(--amber);
}

.risk--low {
  border-left-color: var(--green);
}

.level {
  border-radius: var(--radius-pill);
  background: #fff;
}

.desc {
  color: var(--ink-soft);
}

.risk-grid {
  border-top: 1px dashed var(--rule);
}
.summary {
  padding: 11px 14px;
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.05);
}

.risk {
  border: 1px solid var(--rule);
  border-left: 2px solid var(--rule-strong);
  border-radius: 3px;
  background: rgba(7, 27, 35, 0.78);
}

.risk--critical,
.risk--high {
  border-left-color: var(--danger);
}

.risk--medium {
  border-left-color: var(--amber);
}

.risk--low {
  border-left-color: var(--green);
}

.level {
  border: 1px solid currentColor;
  border-radius: 1px;
  background: transparent;
  font-family: var(--font-mono);
}

.desc {
  color: var(--ink-soft);
}

.risk-grid {
  border-top: 1px solid var(--rule);
}

.risk-grid h4 {
  color: var(--muted);
  font-family: var(--font-mono);
}

.risk-grid p {
  color: var(--ink-soft);
}
</style>
