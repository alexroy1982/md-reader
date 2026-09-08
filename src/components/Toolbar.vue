<script setup lang="ts">
import ThemeToggle from './ThemeToggle.vue'

defineProps<{ sidebarOpen: boolean; editorVisible: boolean }>()
const emit = defineEmits<{
  (e: 'open'): void
  (e: 'new'): void
  (e: 'save'): void
  (e: 'export-html'): void
  (e: 'print'): void
  (e: 'toggle-sidebar'): void
  (e: 'toggle-editor'): void
}>()
</script>

<template>
  <header class="toolbar">
    <button class="icon-button" :aria-label="sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'" :title="sidebarOpen ? '隐藏侧边栏' : '显示侧边栏'" @click="emit('toggle-sidebar')">☰</button>
    <div class="toolbar-actions">
      <button @click="emit('open')">打开</button>
      <button @click="emit('new')">新建</button>
      <button @click="emit('save')">保存</button>
      <span class="sep"></span>
      <button @click="emit('export-html')">导出 HTML</button>
      <button @click="emit('print')">打印 / PDF</button>
      <button class="view-button" :aria-pressed="editorVisible" @click="emit('toggle-editor')">
        {{ editorVisible ? '阅读模式' : '显示原文' }}
      </button>
    </div>
    <slot name="recents" />
    <span class="spacer"></span>
    <ThemeToggle />
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 52px;
  padding: 0 14px;
  background: var(--toolbar-bg);
  border-bottom: 1px solid var(--separator);
  backdrop-filter: blur(18px);
}
.icon-button { border: 0; background: transparent; color: var(--text-secondary); font-size: 17px; cursor: pointer; }
.icon-button:hover { color: var(--text-primary); }
.toolbar-actions { display: flex; align-items: center; gap: 6px; }
button:not(.icon-button) { border: 1px solid var(--control-border); background: var(--control-bg); color: var(--text-primary); border-radius: var(--control-radius); padding: 6px 10px; cursor: pointer; font-size: 12px; }
button:not(.icon-button):hover { background: var(--control-hover-bg); border-color: var(--accent); }
button[aria-pressed="true"] { background: var(--sidebar-selected-bg); color: var(--sidebar-selected-text); }
.sep { width: 1px; height: 20px; background: var(--separator); margin: 0 3px; }
.spacer { flex: 1; }
</style>
