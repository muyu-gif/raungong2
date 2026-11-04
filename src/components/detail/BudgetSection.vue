<script setup lang="ts">
import { computed } from "vue";
import type { PlanSection } from "@/api/types";
import { recalcBudgetDraft } from "@/utils/form";
import { formatMoney } from "@/utils/format";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: PlanSection;
  draft: PlanSection;
  editing: boolean;
}>();

const previewBudget = computed(() => (props.editing ? recalcBudgetDraft(props.draft).budget : props.data.budget));
const overBudget = computed(() => previewBudget.value.planned_yuan - previewBudget.value.requested_yuan);

function addItem() {
  const items = props.draft.budget.items;
  items.push({
    id: `B${Date.now()}`,
    category: "其他",
    name: "",
    unit: "项",
    quantity: 1,
    unit_price_yuan: 0,
    amount_yuan: 0,
    note: "",
  });
}

function lineAmount(item: { quantity: number; unit_price_yuan: number }): number {
  const quantity = Number(item.quantity) || 0;
  const price = Number(item.unit_price_yuan) || 0;
  return Math.round(quantity * price * 100) / 100;
}

function removeItem(index: number) {
  if (props.draft.budget.items.length <= 1) return;
  props.draft.budget.items.splice(index, 1);
}
</script>

<template>
  <div class="budget">
    <div class="totals">
      <div class="total">
        <span class="label">申请预算</span>
        <span class="value tabular">{{ formatMoney(previewBudget.requested_yuan) }}</span>
      </div>
      <div class="total">
        <span class="label">明细合计</span>
        <span class="value tabular">{{ formatMoney(previewBudget.items_total_yuan) }}</span>
      </div>
      <div class="total">
        <span class="label">预备金</span>
        <span class="value tabular">
          <input
            v-if="editing"
            v-model.number="draft.budget.contingency_yuan"
            class="cell-input total-input"
            type="number"
            min="0"
            step="50"
          />
          <template v-else>{{ formatMoney(previewBudget.contingency_yuan) }}</template>
        </span>
      </div>
      <div class="total total--planned">
        <span class="label">计划合计</span>
        <span class="value tabular">{{ formatMoney(previewBudget.planned_yuan) }}</span>
      </div>
    </div>

    <p v-if="overBudget > 0" class="over-note">
      计划合计超出申请预算 {{ formatMoney(overBudget) }}，可下调预备金或压缩明细。
    </p>
    <p v-else-if="overBudget < 0" class="under-note">
      计划合计低于申请预算 {{ formatMoney(Math.abs(overBudget)) }}，仍有结余空间。
    </p>

    <div v-if="!editing" class="table-wrap">
      <table class="data-table budget-table stack-table">
        <thead>
          <tr>
            <th>项目</th>
            <th style="width: 112px">类别</th>
            <th style="width: 58px">单位</th>
            <th style="width: 78px" class="num">数量</th>
            <th style="width: 104px" class="num">单价</th>
            <th style="width: 116px" class="num">金额</th>
            <th style="width: 150px">备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in data.budget.items" :key="item.id || index">
            <td class="cell-strong" data-label="项目">{{ item.name }}</td>
            <td class="muted nowrap" data-label="类别">{{ item.category }}</td>
            <td class="muted" data-label="单位">{{ item.unit }}</td>
            <td class="num" data-label="数量">{{ item.quantity }}</td>
            <td class="num" data-label="单价">{{ formatMoney(item.unit_price_yuan) }}</td>
            <td class="num cell-strong" data-label="金额">{{ formatMoney(item.amount_yuan) }}</td>
            <td class="muted note" data-label="备注">{{ item.note || "—" }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="foot-label">明细合计</td>
            <td class="num foot-value">{{ formatMoney(data.budget.items_total_yuan) }}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>

    <div v-else class="edit-list">
      <div v-for="(item, index) in draft.budget.items" :key="item.id || index" class="edit-card">
        <div class="edit-card-head">
          <span class="edit-index">{{ String(index + 1).padStart(2, "0") }}</span>
          <input
            v-model="item.name"
            class="cell-input edit-name"
            type="text"
            maxlength="40"
            placeholder="项目名称"
          />
          <span class="edit-amount">{{ formatMoney(lineAmount(item)) }}</span>
          <button
            type="button"
            class="row-remove"
            aria-label="删除这条预算"
            :disabled="draft.budget.items.length <= 1"
            @click="removeItem(index)"
          >
            <AppIcon name="close" :size="12" />
          </button>
        </div>

        <div class="edit-grid">
          <label class="edit-field">
            <span>类别</span>
            <input v-model="item.category" class="cell-input" type="text" maxlength="12" />
          </label>
          <label class="edit-field">
            <span>单位</span>
            <input v-model="item.unit" class="cell-input" type="text" maxlength="8" />
          </label>
          <label class="edit-field">
            <span>数量</span>
            <input v-model.number="item.quantity" class="cell-input" type="number" min="0" step="1" />
          </label>
          <label class="edit-field">
            <span>单价（元）</span>
            <input v-model.number="item.unit_price_yuan" class="cell-input" type="number" min="0" step="0.01" />
          </label>
          <label class="edit-field edit-field--wide">
            <span>备注</span>
            <input v-model="item.note" class="cell-input" type="text" maxlength="60" placeholder="可选" />
          </label>
        </div>
      </div>
    </div>

    <div v-if="editing" class="table-actions">
      <button type="button" class="add-line" @click="addItem">
        <AppIcon name="plus" :size="13" />
        <span>添加一条预算明细</span>
      </button>
      <p class="edit-note">保存后由服务端按 数量 × 单价 重算金额、明细合计与计划合计。</p>
    </div>

    <div v-if="(editing ? draft.budget : data.budget).funding_sources?.length" class="funding">
      <span class="funding-label">经费来源</span>
      <span
        v-for="source in (editing ? draft.budget : data.budget).funding_sources"
        :key="source.name"
        class="funding-item"
      >
        {{ source.name }} <span class="tabular">{{ formatMoney(source.amount_yuan) }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.budget {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.totals {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.total {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 16px 16px 15px;
  border-right: 1px solid var(--rule-soft);
  min-width: 0;
}

.total:last-child {
  border-right: none;
}

.total--planned {
  background: rgba(243, 238, 228, 0.45);
}

.label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.value {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.35;
  white-space: nowrap;
}

.total-input {
  width: 100%;
  max-width: 150px;
  height: 30px;
  border-bottom-color: var(--rule-strong);
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  padding-left: 0;
}

.over-note,
.under-note {
  padding: 8px 12px;
  font-size: 11.5px;
  line-height: 1.7;
  border-left: 2px solid var(--amber);
  background: rgba(138, 97, 29, 0.06);
  color: var(--amber);
}

.under-note {
  border-left-color: var(--green);
  background: rgba(60, 91, 75, 0.05);
  color: var(--green);
}

.table-wrap {
  overflow-x: auto;
}

.budget-table {
  min-width: 0;
}

.note {
  font-size: 12px;
}

.num-input {
  width: 78px;
  text-align: right;
}

.amount-preview {
  color: var(--muted);
  font-size: 12.5px;
}

.row-remove {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
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

.foot-label {
  padding-top: 14px;
  text-align: right;
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--faint);
  border-top: 1px solid var(--rule-strong);
}

.foot-value {
  padding-top: 14px;
  border-top: 1px solid var(--rule-strong);
  font-family: var(--font-serif);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
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

.funding {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 20px;
  padding-top: 16px;
  border-top: 1px solid var(--rule-soft);
}

.funding-label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.funding-item {
  font-size: 11.5px;
  color: var(--ink-soft);
}

.funding-item .tabular {
  color: var(--muted);
  margin-left: 4px;
}

@media (max-width: 860px) {
  .totals {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .total:nth-child(2) {
    border-right: none;
  }

  .total:nth-child(1),
  .total:nth-child(2) {
    border-bottom: 1px solid var(--rule-soft);
  }
}
.totals {
  border: 1.5px solid var(--rule);
  border-radius: 18px;
  overflow: hidden;
  background: var(--pink-soft);
}

.total {
  border-right: 1px dashed var(--rule);
}

.total--planned {
  background: #fff;
}

.label {
  color: var(--muted);
}

.value {
  color: var(--ink);
}

.over-note {
  padding: 9px 13px;
  border: 1px solid #f1ddba;
  border-left: 1px solid #f1ddba;
  border-radius: 12px;
  background: var(--amber-soft);
}

.under-note {
  padding: 9px 13px;
  border: 1px solid #bfe3d5;
  border-left: 1px solid #bfe3d5;
  border-radius: 12px;
  background: var(--green-soft);
}

.foot-label {
  border-top: 1px dashed var(--rule-strong);
}

.foot-value {
  border-top: 1px dashed var(--rule-strong);
}

.funding {
  border-top: 1px dashed var(--rule);
}

.funding-label {
  color: var(--muted);
}
.totals {
  border: 1px solid var(--rule);
  border-radius: 3px;
  overflow: hidden;
  background: rgba(57, 197, 187, 0.05);
}

.total {
  border-right: 1px solid var(--rule);
}

.total--planned {
  background: rgba(57, 197, 187, 0.1);
}

.label {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 8.5px;
}

.value {
  color: var(--ink);
  font-family: var(--font-serif);
  font-weight: 600;
}

.total-input {
  background: transparent;
  color: var(--cyan);
}

.over-note {
  padding: 8px 11px;
  border: 1px solid rgba(255, 200, 87, 0.3);
  border-left: 2px solid var(--amber);
  border-radius: 2px;
  background: rgba(255, 200, 87, 0.07);
  color: #ffd98a;
}

.under-note {
  padding: 8px 11px;
  border: 1px solid rgba(92, 225, 185, 0.3);
  border-left: 2px solid var(--green);
  border-radius: 2px;
  background: rgba(92, 225, 185, 0.06);
  color: #9ff2da;
}

.foot-label,
.foot-value {
  border-top: 1px solid var(--rule-strong);
}

.foot-value {
  color: var(--cyan);
  font-family: var(--font-mono);
}

.funding {
  border-top: 1px solid var(--rule);
}

.funding-label {
  color: var(--muted);
  font-family: var(--font-mono);
}

.funding-item {
  color: var(--ink-soft);
}
</style>
