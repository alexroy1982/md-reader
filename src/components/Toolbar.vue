<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'

const emit = defineEmits<{
  (e: 'open'): void
  (e: 'new'): void
  (e: 'save'): void
  (e: 'export-html'): void
  (e: 'print'): void
}>()
</script>

<template>
  <div class="toolbar">
    <button @click="emit('open')">打开</button>
    <button @click="emit('new')">新建</button>
    <button @click="emit('save')">保存</button>
    <span class="sep"></span>
    <button @click="emit('export-html')">导出 HTML</button>
    <button @click="emit('print')">打印 / PDF</button>
    <span class="sep"></span>
    <slot name="recents" />
    <span class="spacer"></span>
    <ThemeToggle />
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--bg-toolbar);
  border-bottom: 1px solid var(--border);
}
button {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-primary);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 13px;
}
button:hover {
  border-color: var(--accent);
}
.sep {
  width: 1px;
  height: 18px;
  background: var(--border);
}
.spacer {
  flex: 1;
}
</style>
