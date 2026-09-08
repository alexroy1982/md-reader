<script setup lang="ts">
import type { TocItem } from '@/types'

defineProps<{ items: TocItem[] }>()
const emit = defineEmits<{ (e: 'select', slug: string): void }>()
</script>

<template>
  <aside class="toc-sidebar" v-if="items.length > 0">
    <div class="toc-title">目录</div>
    <div
      v-for="item in items"
      :key="item.slug"
      class="toc-item"
      role="button"
      tabindex="0"
      :style="{ paddingLeft: `${(item.level - 1) * 14 + 12}px` }"
      @click="emit('select', item.slug)"
      @keydown.enter="emit('select', item.slug)"
      @keydown.space.prevent="emit('select', item.slug)"
    >
      {{ item.text }}
    </div>
  </aside>
</template>

<style scoped>
.toc-sidebar {
  width: 220px;
  flex-shrink: 0;
  overflow-y: auto;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--border);
  padding: 8px 0;
}
.toc-title {
  padding: 4px 12px 8px;
  font-size: 12px;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.toc-item {
  padding: 4px 12px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.toc-item:hover {
  color: var(--sidebar-selected-text);
  background: var(--sidebar-hover-bg);
}
.toc-item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
</style>
