<script setup lang="ts">
import { computed, reactive } from "vue";
import type { ReviewSection } from "@/api/types";
import { renderMarkdown } from "@/utils/markdown";
import StringListEditor from "@/components/detail/StringListEditor.vue";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: ReviewSection;
  draft: ReviewSection;
  editing: boolean;
}>();

const review = computed(() => (props.editing ? props.draft : props.data));
const templateHtml = computed(() => renderMarkdown(review.value.template_markdown));
const checked = reactive(new Set<number>());

function toggleCheck(index: number) {
  if (checked.has(index)) checked.delete(index);
  else checked.add(index);
}

function addKpi() {
  props.draft.kpis.push({ name: "", target: "", method: "" });
}

function removeKpi(index: number) {
  if (props.draft.kpis.length <= 1) return;
  props.draft.kpis.splice(index, 1);
}
</script>

<template>
  <div class="review">
    <section class="kpis">
      <h3 class="block-label">成效指标</h3>

      <table v-if="!editing" class="data-table stack-table">
        <thead>
          <tr>
            <th style="width: 32%">指标</th>
            <th style="width: 28%">目标</th>
            <th>评估方式</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(kpi, index) in review.kpis" :key="index">
            <td class="cell-strong" data-label="指标">{{ kpi.name }}</td>
            <td class="target" data-label="目标">{{ kpi.target }}</td>
            <td class="muted" data-label="评估方式">{{ kpi.method }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="table-wrap">
        <table class="data-table edit-table">
          <thead>
            <tr>
              <th style="width: 30%">指标</th>
              <th style="width: 26%">目标</th>
              <th>评估方式</th>
              <th style="width: 30px" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(kpi, index) in draft.kpis" :key="index">
              <td><input v-model="kpi.name" class="cell-input" type="text" maxlength="40" /></td>
              <td><input v-model="kpi.target" class="cell-input" type="text" maxlength="40" /></td>
              <td><input v-model="kpi.method" class="cell-input" type="text" maxlength="80" /></td>
              <td>
                <button
                  type="button"
                  class="row-remove"
                  aria-label="删除这条指标"
                  :disabled="draft.kpis.length <= 1"
                  @click="removeKpi(index)"
                >
                  <AppIcon name="close" :size="12" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <button type="button" class="add-line" @click="addKpi">
          <AppIcon name="plus" :size="13" />
          <span>添加一条指标</span>
        </button>
      </div>
    </section>

    <section class="retro">
      <h3 class="block-label">复盘问题</h3>
      <ol v-if="!editing">
        <li v-for="(question, index) in review.retro_questions" :key="index">
          <span class="no">{{ String(index + 1).padStart(2, "0") }}</span>
          <span>{{ question }}</span>
        </li>
      </ol>
      <StringListEditor
        v-else
        v-model="review.retro_questions"
        placeholder="一个复盘问题"
        add-label="添加问题"
        :max="12"
      />
    </section>

    <section class="checklist">
      <h3 class="block-label">
        复盘清单 <span class="hint">勾选状态仅保存在当前页面，不会写回方案</span>
      </h3>

      <div v-if="!editing" class="check-list">
        <label v-for="(item, index) in review.checklist" :key="index" class="check-item">
          <input type="checkbox" :checked="checked.has(index)" @change="toggleCheck(index)" />
          <span class="box" aria-hidden="true">
            <AppIcon v-if="checked.has(index)" name="check" :size="10" :stroke-width="2.4" />
          </span>
          <span class="check-text" :class="{ 'is-done': checked.has(index) }">{{ item }}</span>
        </label>
      </div>

      <StringListEditor v-else v-model="review.checklist" placeholder="一条复盘检查项" add-label="添加检查项" :max="20" />
    </section>

    <section class="template">
      <h3 class="block-label">复盘模板</h3>

      <div v-if="!editing" class="template-preview md-preview" v-html="templateHtml" />
      <div v-else class="field">
        <label class="field-label" for="review-template">
          <span>模板 Markdown</span>
          <span class="count">支持标题、列表、加粗</span>
        </label>
        <textarea
          id="review-template"
          v-model="review.template_markdown"
          class="textarea code-area"
          rows="14"
          spellcheck="false"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.review {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.block-label {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 12px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.hint {
  font-size: 9.5px;
  font-weight: 400;
  letter-spacing: 0;
  color: var(--faint);
  opacity: 0.8;
}

.kpis {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.target {
  color: var(--accent);
  font-size: 12.5px;
}

.table-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-x: auto;
}

.edit-table {
  min-width: 620px;
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

.add-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 2px 0;
  font-size: 11.5px;
  color: var(--accent);
}

.add-line:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.retro {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.retro ol {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.retro li {
  display: flex;
  gap: 12px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.retro .no {
  flex: none;
  font-family: var(--font-serif);
  font-size: 10px;
  color: var(--accent);
  padding-top: 2px;
}

.checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.check-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px 26px;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 7px 0;
  cursor: pointer;
  border-bottom: 1px dotted var(--rule);
}

.check-item input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.box {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  flex: none;
  margin-top: 2px;
  border: 1px solid var(--rule-strong);
  background: var(--paper-0);
  color: var(--paper-0);
  transition: all 0.16s var(--ease);
}

.check-item input:checked + .box {
  border-color: var(--green);
  background: var(--green);
}

.check-item input:focus-visible + .box {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.check-text {
  font-size: 12px;
  line-height: 1.7;
  color: var(--ink-soft);
}

.check-text.is-done {
  color: var(--faint);
  text-decoration: line-through;
  text-decoration-color: var(--rule-strong);
}

.template {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-preview {
  padding: 20px 22px;
  border: 1px solid var(--rule);
  background: rgba(243, 238, 228, 0.35);
}

.code-area {
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 1.8;
  min-height: 240px;
}

.md-preview :deep(h1) {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 400;
  margin-bottom: 10px;
}

.md-preview :deep(h2) {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 400;
  margin: 18px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px dashed var(--rule-soft);
}

.md-preview :deep(h3) {
  font-size: 12px;
  font-weight: 500;
  margin: 12px 0 6px;
  color: var(--ink-soft);
}

.md-preview :deep(p) {
  font-size: 12px;
  line-height: 1.9;
  color: var(--muted);
  margin: 6px 0;
}

.md-preview :deep(ul),
.md-preview :deep(ol) {
  margin: 6px 0 6px 4px;
  padding-left: 16px;
  list-style: disc;
}

.md-preview :deep(ol) {
  list-style: decimal;
}

.md-preview :deep(li) {
  font-size: 12px;
  line-height: 1.85;
  color: var(--muted);
  margin: 3px 0;
}

.md-preview :deep(strong) {
  color: var(--ink-soft);
  font-weight: 500;
}

.md-preview :deep(.md-task) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0;
}

.md-preview :deep(.md-task .md-check) {
  flex: none;
  width: 11px;
  height: 11px;
  margin-top: 4px;
  border: 1px solid var(--rule-strong);
  background: var(--paper-0);
  font-size: 8px;
  line-height: 1;
  color: var(--green);
  text-align: center;
}

.md-preview :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 2px solid var(--rule-strong);
  color: var(--muted);
  font-size: 12px;
}

.md-preview :deep(hr) {
  border: none;
  border-top: 1px solid var(--rule);
  margin: 14px 0;
}

.md-preview :deep(code) {
  padding: 1px 4px;
  background: var(--paper-2);
  font-size: 11px;
}

.md-preview :deep(pre) {
  padding: 10px 12px;
  background: var(--paper-2);
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.7;
}

@media (max-width: 700px) {
  .check-list {
    grid-template-columns: minmax(0, 1fr);
  }
}
.template-preview {
  border: 1.5px dashed var(--rule-strong);
  border-radius: 20px;
  background: var(--pink-soft);
}

.check-item {
  border-bottom: 1px dashed var(--rule);
}

.box {
  border-radius: 5px;
}

.md-preview :deep(code) {
  border-radius: 6px;
  background: var(--paper-2);
}

.md-preview :deep(pre) {
  border-radius: 12px;
  background: var(--paper-2);
}
.md-preview :deep(.md-table-wrap) {
  margin: 10px 0;
  overflow-x: auto;
}

.md-preview :deep(.md-table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 11.5px;
}

.md-preview :deep(.md-table th) {
  padding: 6px 8px;
  border-bottom: 1px solid var(--rule);
  background: var(--pink-soft);
  font-size: 10.5px;
  color: var(--ink-soft);
  text-align: left;
}

.md-preview :deep(.md-table td) {
  padding: 6px 8px;
  border-bottom: 1px dashed var(--rule);
  color: var(--muted);
  line-height: 1.6;
}
.template-preview {
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 3px;
  background: rgba(57, 197, 187, 0.04);
}

.check-item {
  border-bottom: 1px solid var(--rule);
}

.box {
  border: 1px solid var(--rule-strong);
  border-radius: 2px;
  background: transparent;
}

.check-text {
  color: var(--ink-soft);
}

.check-text.is-done {
  color: var(--faint);
}

.md-preview :deep(h1),
.md-preview :deep(h2) {
  color: var(--ink);
  font-family: var(--font-sans);
  font-weight: 700;
}

.md-preview :deep(p),
.md-preview :deep(li) {
  color: var(--ink-soft);
}

.md-preview :deep(strong) {
  color: var(--ink);
}

.md-preview :deep(code),
.md-preview :deep(pre) {
  border-radius: 2px;
  background: var(--paper-2);
  color: var(--cyan);
}

.md-preview :deep(.md-table th) {
  background: rgba(57, 197, 187, 0.08);
  border-bottom-color: var(--rule);
  color: var(--muted);
}

.md-preview :deep(.md-table td) {
  border-bottom-color: var(--rule);
  color: var(--ink-soft);
}
</style>
