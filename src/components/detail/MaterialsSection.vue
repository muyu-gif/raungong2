<script setup lang="ts">
import { computed } from "vue";
import type { MaterialsSection } from "@/api/types";
import { MATERIAL_STATUS } from "@/constants/plan";
import { formatInteger, formatMoney, roundMoney } from "@/utils/format";
import StatusMark from "@/components/StatusMark.vue";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: MaterialsSection;
  draft: MaterialsSection;
  editing: boolean;
}>();

const items = computed(() => (props.editing ? props.draft.items : props.data.items));

const summary = computed(() => {
  if (!props.editing) return props.data.summary;
  const rows = props.draft.items;
  const quantities = rows.map((item) => Number(item.quantity) || 0);
  const costs = rows.map((item) => (Number(item.quantity) || 0) * (Number(item.unit_price_yuan) || 0));
  return {
    total_items: rows.length,
    total_quantity: quantities.reduce((sum, value) => sum + value, 0),
    estimated_cost_yuan: roundMoney(costs.reduce((sum, value) => sum + value, 0)),
  };
});

function subtotal(item: { quantity: number; unit_price_yuan: number }): number {
  return roundMoney((Number(item.quantity) || 0) * (Number(item.unit_price_yuan) || 0));
}

function addItem() {
  props.draft.items.push({
    id: `M${Date.now()}`,
    category: "其他",
    name: "",
    spec: "",
    unit: "个",
    quantity: 1,
    unit_price_yuan: 0,
    subtotal_yuan: 0,
    purchase_channel: "",
    owner: "",
    needed_by: "",
    status: "pending",
    note: "",
  });
}

function removeItem(index: number) {
  if (props.draft.items.length <= 1) return;
  props.draft.items.splice(index, 1);
}

function statusMeta(value: string) {
  return MATERIAL_STATUS[value] ?? { label: value || "待采购", tone: "muted" as const };
}
</script>

<template>
  <div class="materials">
    <div class="summary">
      <div class="sum-cell">
        <span class="label">物资项数</span>
        <span class="value tabular">{{ formatInteger(summary.total_items) }}</span>
      </div>
      <div class="sum-cell">
        <span class="label">总数量</span>
        <span class="value tabular">{{ formatInteger(summary.total_quantity) }}</span>
      </div>
      <div class="sum-cell">
        <span class="label">预计成本</span>
        <span class="value tabular">{{ formatMoney(summary.estimated_cost_yuan) }}</span>
      </div>
      <p class="sum-note">金额由 数量 × 单价 得出，保存后以服务端返回为准。</p>
    </div>

    <div v-if="!editing" class="table-wrap">
      <table class="data-table materials-table stack-table">
        <thead>
          <tr>
            <th>物资</th>
            <th style="width: 82px" class="num">数量</th>
            <th style="width: 98px" class="num">单价</th>
            <th style="width: 108px" class="num">小计</th>
            <th style="width: 110px">采购渠道</th>
            <th style="width: 84px">负责人</th>
            <th style="width: 84px">状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, index) in data.items" :key="item.id || index">
            <td data-label="物资">
              <span class="cell-strong">{{ item.name }}</span>
              <span class="cell-sub">
                {{ item.category }}<template v-if="item.spec"> · {{ item.spec }}</template>
              </span>
            </td>
            <td class="num" data-label="数量">{{ item.quantity }} <span class="unit">{{ item.unit }}</span></td>
            <td class="num" data-label="单价">{{ formatMoney(item.unit_price_yuan) }}</td>
            <td class="num cell-strong" data-label="小计">{{ formatMoney(item.subtotal_yuan) }}</td>
            <td class="muted" data-label="采购渠道">{{ item.purchase_channel || "—" }}</td>
            <td class="muted" data-label="负责人">{{ item.owner || "待定" }}</td>
            <td data-label="状态">
              <StatusMark :label="statusMeta(item.status).label" :tone="statusMeta(item.status).tone" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="edit-list">
      <div v-for="(item, index) in draft.items" :key="item.id || index" class="edit-card">
        <div class="edit-card-head">
          <span class="edit-index">{{ String(index + 1).padStart(2, "0") }}</span>
          <input
            v-model="item.name"
            class="cell-input edit-name"
            type="text"
            maxlength="40"
            placeholder="物资名称"
          />
          <span class="edit-amount">{{ formatMoney(subtotal(item)) }}</span>
          <button
            type="button"
            class="row-remove"
            aria-label="删除这条物资"
            :disabled="draft.items.length <= 1"
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
            <span>规格 / 型号</span>
            <input v-model="item.spec" class="cell-input" type="text" maxlength="40" placeholder="可选" />
          </label>
          <label class="edit-field">
            <span>采购渠道</span>
            <input v-model="item.purchase_channel" class="cell-input" type="text" maxlength="30" />
          </label>
          <label class="edit-field">
            <span>负责人</span>
            <input v-model="item.owner" class="cell-input" type="text" maxlength="20" />
          </label>
          <label class="edit-field">
            <span>状态</span>
            <select v-model="item.status" class="cell-select">
              <option v-for="(meta, key) in MATERIAL_STATUS" :key="key" :value="key">{{ meta.label }}</option>
            </select>
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
        <span>添加一条物资</span>
      </button>
      <p class="edit-note">保存后由服务端重算每项小计与物资汇总。</p>
    </div>

    <div v-if="!editing && items.some((item) => item.note)" class="notes">
      <span class="notes-label">备注</span>
      <ul>
        <li v-for="item in items.filter((entry) => entry.note)" :key="item.id">
          <strong>{{ item.name }}</strong>{{ item.note }}
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.materials {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 140px)) minmax(0, 1fr);
  align-items: center;
  gap: 0;
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.sum-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-right: 1px solid var(--rule-soft);
}

.sum-cell:nth-child(3) {
  border-right: none;
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
}

.sum-note {
  padding: 0 0 0 18px;
  font-size: 10px;
  line-height: 1.7;
  color: var(--faint);
}

.table-wrap {
  overflow-x: auto;
}

.materials-table {
  min-width: 0;
}

.unit {
  margin-left: 3px;
  font-size: 10px;
  color: var(--faint);
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

.notes {
  padding-top: 16px;
  border-top: 1px solid var(--rule-soft);
  display: flex;
  gap: 16px;
}

.notes-label {
  flex: none;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
  padding-top: 3px;
}

.notes ul {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.notes li {
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--muted);
}

.notes strong {
  margin-right: 8px;
  font-weight: 500;
  color: var(--ink-soft);
}

@media (max-width: 800px) {
  .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .sum-note {
    display: none;
  }

  .sum-cell {
    padding: 12px;
  }

  .sum-cell:nth-child(3) {
    border-right: none;
  }

  .value {
    font-size: 15px;
  }
}
.summary {
  border: 1.5px solid var(--rule);
  border-radius: 18px;
  overflow: hidden;
  background: var(--pink-soft);
}

.sum-cell {
  border-right: 1px dashed var(--rule);
}

.label {
  color: var(--muted);
}

.sum-note {
  color: var(--muted);
}

.notes {
  border-top: 1px dashed var(--rule);
}
</style>
