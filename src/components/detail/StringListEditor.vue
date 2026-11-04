<script setup lang="ts">
import AppIcon from "@/components/AppIcon.vue";

const items = defineModel<string[]>({ required: true });

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    addLabel?: string;
    max?: number;
    numbered?: boolean;
  }>(),
  {
    placeholder: "填写一条内容",
    addLabel: "添加一条",
    max: 10,
    numbered: true,
  },
);

function add() {
  if (items.value.length >= props.max) return;
  items.value.push("");
}

function remove(index: number) {
  items.value.splice(index, 1);
  if (!items.value.length) items.value.push("");
}
</script>

<template>
  <div class="list-editor">
    <div v-for="index in items.length" :key="index" class="list-row">
      <span v-if="numbered" class="list-no">{{ String(index).padStart(2, "0") }}</span>
      <span v-else class="list-bullet" aria-hidden="true" />
      <input v-model="items[index - 1]" class="input" type="text" :placeholder="placeholder" maxlength="120" />
      <button
        v-if="items.length > 1"
        type="button"
        class="list-remove"
        aria-label="删除这一条"
        @click="remove(index - 1)"
      >
        <AppIcon name="close" :size="12" />
      </button>
    </div>
    <button v-if="items.length < max" type="button" class="list-add" @click="add">
      <AppIcon name="plus" :size="12" />
      <span>{{ addLabel }}</span>
    </button>
  </div>
</template>

<style scoped>
.list-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.list-no {
  width: 20px;
  flex: none;
  font-family: var(--font-serif);
  font-size: 10.5px;
  color: var(--faint);
}

.list-bullet {
  width: 4px;
  height: 4px;
  margin: 0 8px;
  flex: none;
  border-radius: 50%;
  background: var(--rule-strong);
}

.list-row .input {
  height: 38px;
  font-size: 13px;
}

.list-remove {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  flex: none;
  color: var(--faint);
}

.list-remove:hover {
  color: var(--danger);
}

.list-add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 3px 0;
  font-size: 11.5px;
  color: var(--accent);
}

.list-add:hover {
  text-decoration: underline;
  text-underline-offset: 4px;
}
</style>
