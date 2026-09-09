<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { wrapSelection } from '@/lib/codemirror/wrapSelection'
import type { EditorView } from '@codemirror/view'

const tabs = useTabsStore()
const emit = defineEmits<{ (e: 'ready'): void }>()
const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null
let openSearchPanelFn: ((view: EditorView) => void) | null = null
let suppressStoreUpdates = true

function runWrap(marker: string) {
  return (v: EditorView): boolean => {
    const { from, to } = v.state.selection.main
    v.dispatch({ changes: wrapSelection(v.state, from, to, marker) })
    v.focus()
    return true
  }
}

function currentDoc(): string {
  return tabs.activeTab?.content ?? ''
}

onMounted(async () => {
  // CodeMirror 全家桶（数百 KB）从主包移出：编辑器组件壳先渲染，CM 异步就绪
  // highlight 模块静态依赖 @codemirror/view，必须与 CM 一起动态加载，避免回到主包
  const [
    { EditorView, keymap },
    { EditorState },
    { markdown, markdownLanguage },
    { defaultKeymap, history, historyKeymap, indentWithTab },
    { searchKeymap, openSearchPanel, highlightSelectionMatches },
    { syntaxHighlighting },
    { markdownHighlightStyle },
    { languages },
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/state'),
    import('@codemirror/lang-markdown'),
    import('@codemirror/commands'),
    import('@codemirror/search'),
    import('@codemirror/language'),
    import('@/lib/codemirror/highlight'),
    import('@codemirror/language-data'),
  ])

  openSearchPanelFn = openSearchPanel

  const cmTheme = EditorView.theme({
    '&': {
      height: '100%',
      fontSize: '14px',
      backgroundColor: 'var(--bg-editor)',
      color: 'var(--text-primary)',
    },
    '.cm-content': {
      fontFamily: "'Cascadia Code', Consolas, 'Courier New', monospace",
      caretColor: 'var(--text-primary)',
    },
    '.cm-scroller': { overflow: 'auto' },
    '&.cm-focused': { outline: 'none' },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-editor)',
      color: 'var(--text-secondary)',
      border: 'none',
    },
    '.cm-panels': {
      backgroundColor: 'var(--bg-sidebar)',
      color: 'var(--text-primary)',
    },
  })

  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: currentDoc(),
      extensions: [
        history(),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(markdownHighlightStyle),
        highlightSelectionMatches(),
        EditorView.lineWrapping,
        cmTheme,
        keymap.of([
          { key: 'Ctrl-b', run: runWrap('**') },
          { key: 'Ctrl-i', run: runWrap('*') },
          ...searchKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (!suppressStoreUpdates && update.docChanged && tabs.activeId) {
            tabs.updateContent(tabs.activeId, update.state.doc.toString())
          }
        }),
      ],
    }),
  })
  // 初始 EditorState/文档同步不是用户编辑，不能把已保存文件标成 dirty
  suppressStoreUpdates = false
  performance.mark('app:editor-ready')
  emit('ready')
})

// 切换标签：编辑器内容跟随（updateListener 已保证 store 内容最新）
watch(
  () => tabs.activeId,
  () => {
    if (!view) return
    const doc = currentDoc()
    if (view.state.doc.toString() !== doc) {
      suppressStoreUpdates = true
      try {
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } })
      } finally {
        suppressStoreUpdates = false
      }
    }
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
  openSearchPanelFn = null
})

function focusSearch(): void {
  if (view) {
    view.focus()
    openSearchPanelFn?.(view)
  }
}

function scrollEl(): HTMLElement | null {
  return view?.scrollDOM ?? null
}

defineExpose({ focusSearch, scrollEl })
</script>

<template>
  <div ref="host" class="editor-host"></div>
</template>

<style scoped>
.editor-host {
  height: 100%;
  overflow: hidden;
}
.editor-host :deep(.cm-editor) {
  height: 100%;
}
</style>
