<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import TabBar from '@/components/TabBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import TocSidebar from '@/components/TocSidebar.vue'
import Editor from '@/components/Editor.vue'
import Preview from '@/components/Preview.vue'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { useRecentsStore, fileName } from '@/stores/recents'
import { registerShortcuts } from '@/composables/useShortcuts'
import { setupScrollSync } from '@/composables/useScrollSync'
import { openMarkdownDialog, saveMarkdownDialog, readMarkdown, writeMarkdown } from '@/composables/useFileIO'

const tabs = useTabsStore()
const settings = useSettingsStore()
const recents = useRecentsStore()

const editorRef = ref<InstanceType<typeof Editor> | null>(null)
const previewRef = ref<InstanceType<typeof Preview> | null>(null)

async function openPath(path: string): Promise<void> {
  try {
    const content = await readMarkdown(path)
    tabs.openFileTab(path, fileName(path), content)
    await recents.add(path)
  } catch (err) {
    console.error('打开文件失败', err)
    window.alert(`无法打开文件：${path}`)
  }
}

async function openDialog(): Promise<void> {
  const path = await openMarkdownDialog()
  if (path) await openPath(path)
}

async function saveActive(): Promise<void> {
  const tab = tabs.activeTab
  if (!tab || !tabs.isDirty(tab)) return
  let path = tab.path
  if (!path) {
    path = await saveMarkdownDialog()
    if (!path) return
    tab.path = path
    tab.title = fileName(path)
    await recents.add(path)
  }
  try {
    await writeMarkdown(path, tab.content)
    tabs.markSaved(tab.id)
  } catch (err) {
    console.error('保存失败', err)
    window.alert(`保存失败：${path}`)
  }
}

function onCloseTab(id: string): void {
  // Task 14 加未保存确认
  tabs.closeTab(id)
}

let unbindSync: (() => void) | null = null
let unbindShortcuts: (() => void) | null = null

onMounted(async () => {
  await settings.load()
  await recents.load()
  if (tabs.tabs.length === 0) tabs.newTab()
  unbindShortcuts = registerShortcuts({
    save: saveActive,
    open: openDialog,
    newTab: () => { tabs.newTab() },
    print: () => window.print(),
    search: () => editorRef.value?.focusSearch(),
    nextTab: () => tabs.stepTab(1),
    prevTab: () => tabs.stepTab(-1),
  })
})

// 编辑区 ↔ 预览区滚动同步（编辑器 mount 后建立，activeId 变化不影响 DOM 元素）
watch(
  () => [editorRef.value, previewRef.value],
  async () => {
    await nextTick()
    const a = editorRef.value?.scrollEl()
    const b = previewRef.value?.scrollEl()
    if (a && b && !unbindSync) unbindSync = setupScrollSync(a, b)
  },
  { immediate: true, flush: 'post' }
)

onBeforeUnmount(() => {
  unbindSync?.()
  unbindShortcuts?.()
})
</script>

<template>
  <div class="app-shell">
    <Toolbar @open="openDialog" @new="tabs.newTab()" @save="saveActive" />
    <TabBar @close="onCloseTab" />
    <div class="main-area">
      <div class="editor-pane">
        <Editor ref="editorRef" />
      </div>
      <div class="preview-wrap">
        <Preview ref="previewRef" />
      </div>
      <TocSidebar
        :items="previewRef?.tocItems ?? []"
        @select="(slug) => previewRef?.scrollToHeading(slug)"
      />
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.main-area {
  flex: 1;
  display: flex;
  min-height: 0;
}
.editor-pane {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border);
}
.preview-wrap {
  flex: 1;
  min-width: 0;
}
</style>
