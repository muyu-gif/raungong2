<script setup lang="ts">
withDefaults(defineProps<{ tone?: "ready" | "progress" | "danger" | "muted"; label: string }>(), {
  tone: "muted",
});
</script>

<template>
  <span class="mark" :class="`mark--${tone}`">{{ label }}</span>
</template>
