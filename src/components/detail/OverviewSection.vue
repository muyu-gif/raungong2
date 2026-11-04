<script setup lang="ts">
import type { PlanSection } from "@/api/types";
import StringListEditor from "@/components/detail/StringListEditor.vue";

defineProps<{
  data: PlanSection;
  draft: PlanSection;
  editing: boolean;
}>();
</script>

<template>
  <div class="overview">
    <template v-if="!editing">
      <p class="lead">{{ data.summary }}</p>

      <section class="background">
        <h3 class="block-label">活动背景</h3>
        <p>{{ data.background }}</p>
      </section>

      <div class="overview-grid">
        <section class="ov-block">
          <h3 class="block-label">活动目标</h3>
          <ol class="numbered">
            <li v-for="(item, index) in data.objectives" :key="index">{{ item }}</li>
          </ol>
        </section>

        <section class="ov-block">
          <h3 class="block-label">活动亮点</h3>
          <ol class="dashes">
            <li v-for="(item, index) in data.highlights" :key="index">{{ item }}</li>
          </ol>
        </section>

        <section class="ov-block">
          <h3 class="block-label">成功标准</h3>
          <ol class="numbered numbered--soft">
            <li v-for="(item, index) in data.success_criteria" :key="index">{{ item }}</li>
          </ol>
        </section>
      </div>
    </template>

    <template v-else>
      <div class="edit-fields">
        <div class="field">
          <label class="field-label" for="ov-summary"><span>方案摘要</span><span class="count">一段话说明这场活动</span></label>
          <textarea id="ov-summary" v-model="draft.summary" class="textarea" rows="4" maxlength="600" />
        </div>

        <div class="field">
          <label class="field-label" for="ov-background"><span>活动背景</span></label>
          <textarea id="ov-background" v-model="draft.background" class="textarea" rows="4" maxlength="800" />
        </div>

        <div class="field">
          <span class="field-label"><span>活动目标</span><span class="count">建议 3 ～ 5 条</span></span>
          <StringListEditor v-model="draft.objectives" placeholder="例如：帮助新生快速融入校园" add-label="添加目标" :max="8" />
        </div>

        <div class="field">
          <span class="field-label"><span>活动亮点</span></span>
          <StringListEditor v-model="draft.highlights" placeholder="例如：社团联合开场秀" add-label="添加亮点" :max="8" />
        </div>

        <div class="field">
          <span class="field-label"><span>成功标准</span></span>
          <StringListEditor
            v-model="draft.success_criteria"
            placeholder="例如：到场率不低于 90%"
            add-label="添加标准"
            :max="8"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.overview {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.lead {
  font-family: var(--font-serif);
  font-size: 16.5px;
  line-height: 2.05;
  color: var(--ink-soft);
  letter-spacing: 0.01em;
}

.background {
  padding: 20px 22px;
  border-left: 2px solid var(--rule-strong);
  background: rgba(243, 238, 228, 0.5);
}

.background p {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.95;
}

.block-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 26px;
  padding-top: 4px;
}

.ov-block {
  padding-top: 14px;
  border-top: 1px solid var(--rule);
  min-width: 0;
}

.ov-block ol {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ov-block li {
  position: relative;
  padding-left: 22px;
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.numbered {
  counter-reset: ov;
}

.numbered li::before {
  counter-increment: ov;
  content: counter(ov, decimal-leading-zero);
  position: absolute;
  left: 0;
  top: 0;
  font-family: var(--font-serif);
  font-size: 10px;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.numbered--soft li::before {
  color: var(--faint);
}

.dashes li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.85em;
  width: 10px;
  height: 1px;
  background: var(--rule-strong);
}

.edit-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 26px;
}

.edit-fields > .field:first-child,
.edit-fields > .field:nth-child(2) {
  grid-column: span 2;
}

@media (max-width: 960px) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
  }

  .edit-fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .edit-fields > .field:first-child,
  .edit-fields > .field:nth-child(2) {
    grid-column: span 1;
  }
}
.lead {
  color: var(--ink-soft);
}

.background {
  padding: 18px 20px;
  border: 1.5px dashed var(--rule-strong);
  border-left: 1.5px dashed var(--rule-strong);
  border-radius: 18px;
  background: var(--pink-soft);
}

.block-label {
  color: var(--muted);
}

.ov-block {
  padding-top: 12px;
  border-top: 1px dashed var(--rule-strong);
}

.numbered li::before {
  color: var(--accent);
}

.dashes li::before {
  background: var(--rule-strong);
}

.edit-fields .field {
  padding: 14px 16px;
  border: 1px solid var(--rule);
  border-radius: 16px;
  background: #fff;
}
.lead {
  color: var(--ink-soft);
}

.background {
  padding: 16px 18px;
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 2px;
  background: rgba(57, 197, 187, 0.05);
}

.block-label {
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: 0.12em;
}

.ov-block {
  padding-top: 12px;
  border-top: 1px solid var(--rule);
}

.numbered li::before {
  color: var(--cyan);
  font-family: var(--font-mono);
}

.dashes li::before {
  background: var(--rule-strong);
}

.ov-block li {
  color: var(--ink-soft);
}

.edit-fields .field {
  padding: 12px 14px;
  border: 1px solid var(--rule);
  border-radius: 3px;
  background: rgba(4, 15, 21, 0.6);
}
</style>
