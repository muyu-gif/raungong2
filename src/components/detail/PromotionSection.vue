<script setup lang="ts">
import { computed } from "vue";
import { ElMessage } from "element-plus";
import type { PromotionSection } from "@/api/types";
import { copyText } from "@/utils/download";
import { formatDateTime } from "@/utils/format";
import StringListEditor from "@/components/detail/StringListEditor.vue";
import AppIcon from "@/components/AppIcon.vue";

const props = defineProps<{
  data: PromotionSection;
  draft: PromotionSection;
  editing: boolean;
}>();

const promo = computed(() => (props.editing ? props.draft : props.data));

function hashtag(value: string): string {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.startsWith("#") ? text : `#${text}`;
}

const copyAll = computed(() => {
  const copy = promo.value.copy;
  const tags = (copy?.hashtags ?? []).map(hashtag).filter(Boolean).join(" ");
  return [copy?.title, "", copy?.body, "", tags, copy?.call_to_action].filter((line) => line !== undefined).join("\n");
});

async function copyContent(text: string, label: string) {
  const ok = await copyText(text);
  if (ok) ElMessage({ message: `${label}已复制`, type: "success" });
  else ElMessage({ message: "复制失败，请手动选择文本", type: "error" });
}

function displayPublish(value: string | null | undefined): string {
  if (!value) return "—";
  return String(value).includes("T") ? formatDateTime(value) : String(value);
}
</script>

<template>
  <div class="promotion">
    <blockquote v-if="!editing" class="slogan">
      {{ promo.slogan }}
    </blockquote>

    <div v-else class="field">
      <label class="field-label" for="slogan"><span>活动口号</span><span class="count">一句话记住这场活动</span></label>
      <input id="slogan" v-model="promo.slogan" class="input" type="text" maxlength="60" />
    </div>

    <section class="messages">
      <h3 class="block-label">核心信息</h3>
      <ol v-if="!editing">
        <li v-for="(message, index) in promo.key_messages" :key="index">
          <span class="no">{{ String(index + 1).padStart(2, "0") }}</span>
          <span>{{ message }}</span>
        </li>
      </ol>
      <StringListEditor
        v-else
        v-model="promo.key_messages"
        placeholder="一条传播要点"
        add-label="添加一条"
        :max="6"
        class="messages-editor"
      />
    </section>

    <section class="copy-card">
      <header class="copy-head">
        <div>
          <h3 class="block-label">朋友圈文案</h3>
          <p class="copy-note">可直接复制，发布到班级群或朋友圈。</p>
        </div>
        <button type="button" class="copy-btn" @click="copyContent(copyAll, '文案')">
          <AppIcon name="copy" :size="13" />
          <span>复制全文</span>
        </button>
      </header>

      <template v-if="!editing">
        <h4 class="copy-title">{{ promo.copy.title }}</h4>
        <p class="copy-body">{{ promo.copy.body }}</p>
        <p v-if="promo.copy.hashtags?.length" class="hashtags">
          <span v-for="tag in promo.copy.hashtags" :key="tag" class="tag">{{ hashtag(tag) }}</span>
        </p>
        <p class="cta">{{ promo.copy.call_to_action }}</p>
      </template>

      <div v-else class="copy-edit">
        <div class="field">
          <label class="field-label" for="copy-title"><span>标题</span></label>
          <input id="copy-title" v-model="promo.copy.title" class="input" type="text" maxlength="80" />
        </div>
        <div class="field">
          <label class="field-label" for="copy-body"><span>正文</span></label>
          <textarea id="copy-body" v-model="promo.copy.body" class="textarea" rows="5" maxlength="800" />
        </div>
        <div class="field">
          <span class="field-label"><span>话题标签</span><span class="count">无需输入 #</span></span>
          <StringListEditor v-model="promo.copy.hashtags" placeholder="例如：迎新晚会" add-label="添加标签" :max="8" :numbered="false" />
        </div>
        <div class="field">
          <label class="field-label" for="copy-cta"><span>行动号召</span></label>
          <input id="copy-cta" v-model="promo.copy.call_to_action" class="input" type="text" maxlength="120" />
        </div>
      </div>
    </section>

    <section class="channels">
      <h3 class="block-label">宣传渠道</h3>

      <table v-if="!editing" class="data-table stack-table">
        <thead>
          <tr>
            <th style="width: 132px">渠道</th>
            <th>内容</th>
            <th style="width: 140px">发布时间</th>
            <th style="width: 124px">负责人</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(channel, index) in promo.channels" :key="index">
            <td class="cell-strong" data-label="渠道">{{ channel.channel }}</td>
            <td class="muted" data-label="内容">{{ channel.content }}</td>
            <td class="muted publish" data-label="发布时间">{{ displayPublish(channel.publish_at) }}</td>
            <td class="nowrap" data-label="负责人">{{ channel.owner }}</td>
          </tr>
        </tbody>
      </table>

      <div v-else class="table-wrap">
        <table class="data-table edit-table">
          <thead>
            <tr>
              <th style="width: 130px">渠道</th>
              <th>内容</th>
              <th style="width: 140px">发布时间</th>
              <th style="width: 100px">负责人</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(channel, index) in draft.channels" :key="index">
              <td><input v-model="channel.channel" class="cell-input" type="text" maxlength="20" /></td>
              <td><input v-model="channel.content" class="cell-input" type="text" maxlength="120" /></td>
              <td><input v-model="channel.publish_at" class="cell-input" type="text" maxlength="40" /></td>
              <td><input v-model="channel.owner" class="cell-input" type="text" maxlength="20" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="poster">
      <h3 class="block-label">海报文字</h3>

      <template v-if="!editing">
        <div class="poster-grid">
          <div class="poster-field">
            <span class="poster-label">主标题</span>
            <span class="poster-value headline">{{ promo.poster_copy.headline }}</span>
          </div>
          <div class="poster-field">
            <span class="poster-label">副标题</span>
            <span class="poster-value">{{ promo.poster_copy.subheadline }}</span>
          </div>
          <div class="poster-field">
            <span class="poster-label">页脚</span>
            <span class="poster-value footer">{{ promo.poster_copy.footer }}</span>
          </div>
        </div>
      </template>

      <div v-else class="poster-grid">
        <div class="field">
          <label class="field-label" for="poster-headline"><span>主标题</span></label>
          <input id="poster-headline" v-model="promo.poster_copy.headline" class="input" type="text" maxlength="60" />
        </div>
        <div class="field">
          <label class="field-label" for="poster-sub"><span>副标题</span></label>
          <input id="poster-sub" v-model="promo.poster_copy.subheadline" class="input" type="text" maxlength="60" />
        </div>
        <div class="field">
          <label class="field-label" for="poster-footer"><span>页脚</span></label>
          <input id="poster-footer" v-model="promo.poster_copy.footer" class="input" type="text" maxlength="80" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.promotion {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.block-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: var(--faint);
}

.slogan {
  position: relative;
  margin: 0;
  padding: 6px 0 22px 30px;
  font-family: var(--font-serif);
  font-size: clamp(22px, 2.6vw, 30px);
  font-weight: 600;
  line-height: 1.6;
  color: var(--ink);
  border-bottom: 1px solid var(--rule);
}

.slogan::before {
  content: "“";
  position: absolute;
  left: 0;
  top: -6px;
  font-family: Georgia, var(--font-serif);
  font-size: 44px;
  line-height: 1;
  color: var(--accent);
  opacity: 0.55;
}

.messages ol {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.messages-editor {
  margin-top: 12px;
}

.messages li {
  display: flex;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--rule-soft);
  font-size: 12.5px;
  line-height: 1.8;
  color: var(--ink-soft);
}

.messages .no {
  flex: none;
  font-family: var(--font-serif);
  font-size: 10px;
  color: var(--accent);
  padding-top: 2px;
}

.copy-card {
  padding: 20px 22px;
  border: 1px solid var(--rule);
  background: rgba(243, 238, 228, 0.4);
}

.copy-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.copy-note {
  margin-top: 4px;
  font-size: 10.5px;
  color: var(--faint);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--rule);
  background: var(--paper-0);
  font-size: 11px;
  color: var(--muted);
  transition: all 0.16s var(--ease);
}

.copy-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.copy-title {
  margin-top: 18px;
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  line-height: 1.6;
}

.copy-body {
  margin-top: 8px;
  font-size: 12.5px;
  line-height: 1.95;
  color: var(--muted);
  white-space: pre-wrap;
}

.hashtags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.tag {
  padding: 2px 8px;
  border: 1px solid var(--rule);
  background: var(--paper-0);
  font-size: 10.5px;
  color: var(--muted);
}

.cta {
  margin-top: 12px;
  font-size: 12px;
  color: var(--accent);
  letter-spacing: 0.02em;
}

.copy-edit {
  display: grid;
  gap: 16px;
  margin-top: 18px;
}

.channels {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.poster {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.poster-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.poster-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-left: 1px solid var(--rule);
}

.poster-label {
  font-size: 9.5px;
  letter-spacing: 0.14em;
  color: var(--faint);
}

.poster-value {
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-soft);
}

.poster-value.headline {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
}

.poster-value.footer {
  color: var(--muted);
}

.table-wrap {
  overflow-x: auto;
}

.edit-table {
  min-width: 720px;
}

@media (max-width: 760px) {
  .messages ol,
  .poster-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .poster-field {
    padding: 8px 0 8px 12px;
  }
}
.slogan {
  border-bottom: 1px dashed var(--rule-strong);
}

.slogan::before {
  color: var(--accent);
}

.copy-card {
  border: 1.5px dashed var(--rule-strong);
  border-radius: 20px;
  background: var(--pink-soft);
}

.copy-btn {
  border-radius: var(--radius-pill);
  background: #fff;
}

.tag {
  border-radius: var(--radius-pill);
  background: #fff;
}

.poster-field {
  border-left: 1.5px solid var(--rule-strong);
  border-radius: 0 14px 14px 0;
  background: #fff;
}

.messages li {
  border-top: 1px dashed var(--rule-soft);
}

.publish {
  font-size: 11.5px;
  white-space: normal;
}
.slogan {
  border-bottom: 1px solid var(--rule-strong);
  color: var(--ink);
}

.slogan::before {
  color: var(--accent);
}

.copy-card {
  border: 1px solid var(--rule);
  border-left: 2px solid var(--accent);
  border-radius: 3px;
  background: rgba(57, 197, 187, 0.05);
}

.copy-btn {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: rgba(4, 15, 21, 0.7);
  color: var(--muted);
}

.copy-btn:hover {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--cyan);
}

.tag {
  border: 1px solid var(--rule);
  border-radius: 2px;
  background: transparent;
  color: var(--muted);
}

.poster-field {
  border-left: 1px solid var(--rule-strong);
  border-radius: 0;
  background: transparent;
}

.messages li {
  border-top: 1px solid var(--rule-soft);
}

.publish {
  font-family: var(--font-mono);
  font-size: 10px;
}
</style>
