<script setup lang="ts">
import { useTabsStore } from '@/stores/tabs'
import type { Tab } from '@/types'

const tabs = useTabsStore()
const emit = defineEmits<{ (e: 'close', id: string): void }>()

function onClose(tab: Tab, ev: MouseEvent): void {
  ev.stopPropagation()
  emit('close', tab.id)
}
</script>

<template>
  <div class="tab-bar">
    <div
      v-for="tab in tabs.tabs"
      :key="tab.id"
      class="tab"
      role="tab"
      :aria-selected="tab.id === tabs.activeId"
      tabindex="0"
      :class="{ active: tab.id === tabs.activeId }"
      @click="tabs.setActive(tab.id)"
      @keydown.enter="tabs.setActive(tab.id)"
      @keydown.space.prevent="tabs.setActive(tab.id)"
    >
      <span class="dot" :class="{ dirty: tabs.isDirty(tab) }">●</span>
      <span class="title">{{ tab.title }}</span>
      <button class="close" title="关闭" @click="onClose(tab, $event)">×</button>
    </div>
  </div>
</template>

<style scoped>
.tab-bar {
  display: flex;
  overflow-x: auto;
  background: var(--bg-app);
  border-bottom: 1px solid var(--border);
  user-select: none;
}
.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-right: 1px solid var(--border);
  cursor: pointer;
  color: var(--text-secondary);
  white-space: nowrap;
}
.tab.active {
  background: var(--bg-editor);
  color: var(--text-primary);
  box-shadow: inset 0 2px 0 var(--accent);
}
.dot {
  font-size: 10px;
  color: transparent;
}
.dot.dirty {
  color: var(--accent);
}
.close {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 14px;
  padding: 0 2px;
  border-radius: 4px;
}
.close:hover {
  color: var(--text-primary);
  background: var(--border);
}
</style>
