<script setup lang="ts">
import { computed } from "vue";
import type { TaskItem, TasksSection } from "@/api/types";
import { PRIORITY_META } from "@/constants/plan";
import { formatDate } from "@/utils/format";
import StatusMark from "@/components/StatusMark.vue";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: TasksSection;
  draft: TasksSection;
  editing: boolean;
}>();

const groups = computed(() => {
  const map = new Map<string, TaskItem[]>();
  for (const item of props.data.items ?? []) {
    const key = item.phase || "未分组";
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map.entries()).map(([phase, items]) => ({
    phase,
    items,
    high: items.filter((item) => item.priority === "high").length,
  }));
});

const summary = computed(() => {
  if (!props.editing) return props.data.summary;
  const byPriority = { high: 0, medium: 0, low: 0 };
  for (const item of props.draft.items) {
    if (item.priority === "high" || item.priority === "medium" || item.priority === "low") {
      byPriority[item.priority] += 1;
    }
  }
  return { total: props.draft.items.length, by_priority: byPriority };
});

function priorityMeta(value: string) {
  return PRIORITY_META[value] ?? { label: value || "—", tone: "muted" as const };
}

function addItem() {
  props.draft.items.push({
    id: `T${Date.now()}`,
    phase: props.draft.items[0]?.phase || "筹备",
    name: "",
    role: "执行",
    owner: "",
    collaborators: [],
    start_at: "",
    due_at: "",
    priority: "medium",
    depends_on: [],
    acceptance: "",
    notes: "",
  });
}

function removeItem(index: number) {
  if (props.draft.items.length <= 1) return;
  props.draft.items.splice(index, 1);
}
</script>

<template>
  <div class="tasks">
    <div class="summary">
      <div class="sum-cell">
        <span class="label">任务总数</span>
        <span class="value tabular">{{ summary.total }}</span>
      </div>
      <div class="sum-cell">
        <span class="label">高优先</span>
        <span class="value tabular accent">{{ summary.by_priority?.high ?? 0 }}</span>
      </div>
      <div class="sum-cell">
        <span class="label">中优先</span>
        <span class="value tabular">{{ summary.by_priority?.medium ?? 0 }}</span>
      </div>
      <div class="sum-cell">
        <span class="label">低优先</span>
        <span class="value tabular">{{ summary.by_priority?.low ?? 0 }}</span>
      </div>
    </div>

    <template v-if="!editing">
      <section v-for="group in groups" :key="group.phase" class="task-group">
        <header class="group-head">
          <h3>{{ group.phase }}</h3>
          <span class="group-meta">{{ group.items.length }} 项<span v-if="group.high"> · 高优先 {{ group.high }}</span></span>
        </header>

        <table class="data-table stack-table">
          <thead>
            <tr>
              <th>任务</th>
              <th style="width: 92px">负责人</th>
              <th style="width: 86px">角色</th>
              <th style="width: 64px">优先级</th>
              <th style="width: 104px">截止</th>
              <th style="width: 30%">验收标准</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in group.items" :key="item.id">
              <td data-label="任务">
                <span class="cell-strong">{{ item.name }}</span>
                <span v-if="item.depends_on?.length" class="cell-sub">依赖 {{ item.depends_on.join("、") }}</span>
              </td>
              <td data-label="负责人">{{ item.owner || "待定" }}</td>
              <td class="muted" data-label="角色">{{ item.role }}</td>
              <td data-label="优先级">
                <StatusMark :label="priorityMeta(item.priority).label" :tone="priorityMeta(item.priority).tone" />
              </td>
              <td class="nowrap" data-label="截止">
                <span class="date">{{ formatDate(item.due_at) }}</span>
                <span v-if="item.start_at" class="cell-sub">{{ formatDate(item.start_at) }} 起</span>
              </td>
              <td class="acceptance" data-label="验收标准">{{ item.acceptance || "—" }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>

    <template v-else>
      <div class="edit-list">
        <div v-for="(item, index) in draft.items" :key="item.id || index" class="edit-card">
          <div class="edit-card-head">
            <span class="edit-index">{{ String(index + 1).padStart(2, "0") }}</span>
            <input
              v-model="item.name"
              class="cell-input edit-name"
              type="text"
              maxlength="60"
              placeholder="任务名称"
            />
            <button
              type="button"
              class="row-remove"
              aria-label="删除这条任务"
              :disabled="draft.items.length <= 1"
              @click="removeItem(index)"
            >
              <AppIcon name="close" :size="12" />
            </button>
          </div>

          <div class="edit-grid edit-grid--3">
            <label class="edit-field">
              <span>阶段</span>
              <input v-model="item.phase" class="cell-input" type="text" maxlength="20" />
            </label>
            <label class="edit-field">
              <span>负责人</span>
              <input v-model="item.owner" class="cell-input" type="text" maxlength="20" />
            </label>
            <label class="edit-field">
              <span>角色</span>
              <input v-model="item.role" class="cell-input" type="text" maxlength="20" />
            </label>
            <label class="edit-field">
              <span>优先级</span>
              <select v-model="item.priority" class="cell-select">
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </label>
            <label class="edit-field">
              <span>开始日期</span>
              <input v-model="item.start_at" class="cell-input" type="date" />
            </label>
            <label class="edit-field">
              <span>截止日期</span>
              <input v-model="item.due_at" class="cell-input" type="date" />
            </label>
            <label class="edit-field edit-field--full">
              <span>验收标准</span>
              <textarea v-model="item.acceptance" class="cell-input cell-textarea" rows="2" maxlength="200" />
            </label>
            <label class="edit-field edit-field--full">
              <span>备注</span>
              <input v-model="item.notes" class="cell-input" type="text" maxlength="120" placeholder="可选" />
            </label>
          </div>
        </div>
      </div>

      <div class="table-actions">
        <button type="button" class="add-line" @click="addItem">
          <AppIcon name="plus" :size="13" />
          <span>添加一条任务</span>
        </button>
        <p class="edit-note">保存后由服务端整体替换本节，汇总数量按当前优先级重算。</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.tasks {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 1px solid var(--rule-strong);
  border-bottom: 1px solid var(--rule);
}

.sum-cell {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 13px 16px;
  border-right: 1px solid var(--rule-soft);
}

.sum-cell:last-child {
  border-right: none;
}

.label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.value {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--ink);
}

.value.accent {
  color: var(--accent);
}

.task-group {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.group-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 10px;
}

.group-head h3 {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
}

.group-meta {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: var(--faint);
}

.task-group .data-table {
  table-layout: fixed;
}

.acceptance {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.7;
}

.date {
  font-size: 12px;
  color: var(--ink-soft);
  font-variant-numeric: tabular-nums;
}

.table-wrap {
  overflow-x: auto;
}

.edit-table {
  min-width: 980px;
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

@media (max-width: 700px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sum-cell:nth-child(2) {
    border-right: none;
  }

  .sum-cell:nth-child(1),
  .sum-cell:nth-child(2) {
    border-bottom: 1px solid var(--rule-soft);
  }

  .task-group {
    overflow-x: visible;
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

.value {
  color: var(--ink);
}
</style>
