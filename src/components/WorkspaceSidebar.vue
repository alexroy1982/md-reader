<script setup lang="ts">
import { computed } from 'vue'
import TocSidebar from './TocSidebar.vue'
import type { RecentFile } from '@/types'
import type { TocItem } from '@/types'

const props = defineProps<{
  open: boolean
  recentItems: RecentFile[]
  tocItems: TocItem[]
}>()

const emit = defineEmits<{
  (e: 'open-recent', path: string): void
  (e: 'select-toc', slug: string): void
  (e: 'close'): void
}>()

const hasRecent = computed(() => props.recentItems.length > 0)
</script>

<template>
  <aside v-if="open" class="workspace-sidebar" aria-label="文档侧边栏">
    <div class="sidebar-header">
      <span>工作区</span>
      <button class="icon-button" aria-label="隐藏侧边栏" title="隐藏侧边栏" @click="emit('close')">‹</button>
    </div>

    <section class="sidebar-section">
      <div class="section-label">最近打开</div>
      <div v-if="!hasRecent" class="sidebar-empty">暂无最近文档</div>
      <template v-else>
        <button
          v-for="item in recentItems"
          :key="item.path"
          class="recent-item"
          :title="item.path"
          @click="emit('open-recent', item.path)"
        >
          <span class="recent-icon">▤</span>
          <span class="recent-name">{{ item.name }}</span>
        </button>
      </template>
    </section>

    <section v-if="tocItems.length" class="sidebar-section outline-section">
      <div class="section-label">本文目录</div>
      <TocSidebar :items="tocItems" @select="emit('select-toc', $event)" />
    </section>
  </aside>
</template>

<style scoped>
.workspace-sidebar {
  width: 248px;
  flex: 0 0 248px;
  min-height: 0;
  overflow-y: auto;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--separator);
  color: var(--text-primary);
}
.sidebar-header {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 18px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--text-secondary);
  text-transform: uppercase;
}
.icon-button {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}
.icon-button:hover { background: var(--sidebar-hover-bg); color: var(--text-primary); }
.sidebar-section { padding: 4px 10px 14px; }
.section-label {
  padding: 8px 8px 6px;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.sidebar-empty { padding: 8px; color: var(--text-secondary); font-size: 12px; }
.recent-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 9px;
  border: 0;
  border-radius: 7px;
  padding: 8px;
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  font: inherit;
}
.recent-item:hover { background: var(--sidebar-hover-bg); }
.recent-icon { color: var(--accent); font-size: 14px; }
.recent-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.outline-section :deep(.toc-sidebar) {
  width: auto;
  overflow: visible;
  border: 0;
  background: transparent;
  padding: 0;
}
.outline-section :deep(.toc-title) { display: none; }
.outline-section :deep(.toc-item) { border-radius: 6px; padding-top: 6px; padding-bottom: 6px; }
</style>
