<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import TabBar from '@/components/TabBar.vue'
import Toolbar from '@/components/Toolbar.vue'
import RecentsMenu from '@/components/RecentsMenu.vue'
import TocSidebar from '@/components/TocSidebar.vue'
import Editor from '@/components/Editor.vue'
import Preview from '@/components/Preview.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { useRecentsStore, fileName } from '@/stores/recents'
import { registerShortcuts } from '@/composables/useShortcuts'
import { setupScrollSync } from '@/composables/useScrollSync'
import { openMarkdownDialog, saveMarkdownDialog, readMarkdown, writeMarkdown } from '@/composables/useFileIO'
import { exportCurrentHtml } from '@/composables/useExport'

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
  try {
    const path = await openMarkdownDialog()
    if (path) await openPath(path)
  } catch (err) {
    // 非 tauri 环境（纯浏览器 dev）dialog 插件不可用
    console.error('打开文件对话框失败', err)
    window.alert('当前环境不支持文件对话框')
  }
}

async function saveActive(): Promise<void> {
  const tab = tabs.activeTab
  if (!tab || !tabs.isDirty(tab)) return
  let path = tab.path
  if (!path) {
    try {
      path = await saveMarkdownDialog()
    } catch (err) {
      // 非 tauri 环境（纯浏览器 dev）dialog 插件不可用
      console.error('打开保存对话框失败', err)
      window.alert('当前环境不支持文件对话框')
      return
    }
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

async function exportHtml(): Promise<void> {
  const tab = tabs.activeTab
  if (!tab) return
  await exportCurrentHtml(tab.title, previewRef.value?.bodyHtml() ?? '', settings.theme)
}

// window.print() 在 WebView2 静默无效；Tauri 环境走 Rust command 调 WebView2 原生打印对话框
function printPage(): void {
  if ('__TAURI_INTERNALS__' in window) {
    void import('@tauri-apps/api/core').then(({ invoke }) =>
      invoke('print_page').catch((e) => {
        console.error('打印失败', e)
        window.alert(`打印失败：${e}`)
      })
    )
  } else {
    window.print() // 纯浏览器 dev 回退
  }
}

// 确认弹窗状态
const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolve: ((value: string) => void) | null = null

function askConfirm(message: string): Promise<string> {
  confirmMessage.value = message
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolve = resolve
  })
}

function onConfirmResolve(value: string): void {
  confirmVisible.value = false
  confirmResolve?.(value)
  confirmResolve = null
}

// 保存指定标签（供关闭确认复用；复用 saveActive 前先激活）
async function saveTab(id: string): Promise<void> {
  tabs.setActive(id)
  await saveActive()
}

// 关闭单个标签：脏则询问
async function onCloseTab(id: string): Promise<void> {
  const tab = tabs.tabs.find((t) => t.id === id)
  if (!tab) return
  if (tabs.isDirty(tab)) {
    const choice = await askConfirm(`「${tab.title}」有未保存的更改`)
    if (choice === 'cancel') return
    if (choice === 'save') {
      await saveTab(id)
      if (tabs.isDirty(tab)) return // 未保存成功（如取消另存对话框），视为取消关闭
    }
  }
  tabs.closeTab(id)
}

let unbindSync: (() => void) | null = null
let unbindShortcuts: (() => void) | null = null
let unlistenOpenFile: (() => void) | null = null
let unlistenDragDrop: (() => void) | null = null
let unlistenClose: (() => void) | null = null

onMounted(async () => {
  performance.mark('app:mounted')
  await settings.load()
  await recents.load()
  if (tabs.tabs.length === 0) tabs.newTab()
  unbindShortcuts = registerShortcuts({
    save: saveActive,
    open: openDialog,
    newTab: () => { tabs.newTab() },
    print: printPage,
    search: () => editorRef.value?.focusSearch(),
    nextTab: () => tabs.stepTab(1),
    prevTab: () => tabs.stepTab(-1),
  })

  // Tauri 环境：监听 Rust 发来的 open-file（双击关联文件 / 二次实例）
  if ('__TAURI_INTERNALS__' in window) {
    const { listen, emit } = await import('@tauri-apps/api/event')
    unlistenOpenFile = await listen<string>('open-file', (event) => {
      void openPath(event.payload)
    })
    await emit('frontend-ready')

    const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
    const { getCurrentWindow } = await import('@tauri-apps/api/window')

    unlistenDragDrop = await getCurrentWebviewWindow().onDragDropEvent((event) => {
      if (event.payload.type === 'drop') {
        for (const p of event.payload.paths) {
          if (/\.(md|markdown)$/i.test(p)) void openPath(p)
        }
      }
    })

    unlistenClose = await getCurrentWindow().onCloseRequested(async (event) => {
      const dirty = tabs.tabs.filter((t) => tabs.isDirty(t))
      if (dirty.length === 0) return
      event.preventDefault()
      const choice = await askConfirm(`有 ${dirty.length} 个标签页包含未保存的更改`)
      if (choice === 'cancel') return
      if (choice === 'save') {
        for (const t of dirty) await saveTab(t.id)
        if (tabs.tabs.some((t) => tabs.isDirty(t))) return // 有未成功保存的，放弃关闭
      } else {
        // discard：先清脏标记，否则下面的 close() 会再次触发本拦截造成死循环
        for (const t of dirty) tabs.markSaved(t.id)
      }
      try {
        await getCurrentWindow().close()
      } catch (err) {
        // 权限缺失等异常不能静默： preventDefault 已生效，静默会让窗口永远无法关闭
        console.error('关闭窗口失败', err)
        window.alert(`关闭窗口失败：${err}`)
      }
    })
  }
})

// 编辑区 ↔ 预览区滚动同步（编辑器 mount 后建立，activeId 变化不影响 DOM 元素）
watch(
  () => [editorRef.value, previewRef.value],
  async () => {
    await nextTick()
    trySetupScrollSync()
  },
  { immediate: true, flush: 'post' }
)

async function trySetupScrollSync(): Promise<void> {
  await nextTick()
  const a = editorRef.value?.scrollEl()
  const b = previewRef.value?.scrollEl()
  if (a && b && !unbindSync) unbindSync = setupScrollSync(a, b)
}

function onEditorReady(): void {
  void trySetupScrollSync()
}

onBeforeUnmount(() => {
  unbindSync?.()
  unbindShortcuts?.()
  unlistenOpenFile?.()
  unlistenDragDrop?.()
  unlistenClose?.()
})
</script>

<template>
  <div class="app-shell">
    <Toolbar @open="openDialog" @new="tabs.newTab()" @save="saveActive" @export-html="exportHtml" @print="printPage">
      <template #recents>
        <RecentsMenu @open="(path) => void openPath(path)" />
      </template>
    </Toolbar>
    <TabBar @close="onCloseTab" />
    <div class="main-area">
      <div class="editor-pane">
        <Editor ref="editorRef" @ready="onEditorReady" />
      </div>
      <div class="preview-wrap">
        <Preview ref="previewRef" />
      </div>
      <TocSidebar
        :items="previewRef?.tocItems ?? []"
        @select="(slug) => previewRef?.scrollToHeading(slug)"
      />
    </div>
    <ConfirmDialog
      v-if="confirmVisible"
      :message="confirmMessage"
      :buttons="[
        { label: '保存', value: 'save', primary: true },
        { label: '不保存', value: 'discard' },
        { label: '取消', value: 'cancel' },
      ]"
      @resolve="onConfirmResolve"
    />
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
