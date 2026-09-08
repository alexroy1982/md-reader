<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useTabsStore } from '@/stores/tabs'
import { wrapSelection } from '@/lib/codemirror/wrapSelection'
import type { EditorView } from '@codemirror/view'

const tabs = useTabsStore()
const emit = defineEmits<{ (e: 'ready'): void }>()
const host = ref<HTMLElement | null>(null)
let view: EditorView | null = null

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
  const [
    { EditorView, keymap },
    { EditorState },
    { markdown, markdownLanguage },
    { defaultKeymap, history, historyKeymap, indentWithTab },
    { searchKeymap, openSearchPanel, highlightSelectionMatches },
    { syntaxHighlighting, defaultHighlightStyle },
  ] = await Promise.all([
    import('@codemirror/view'),
    import('@codemirror/state'),
    import('@codemirror/lang-markdown'),
    import('@codemirror/commands'),
    import('@codemirror/search'),
    import('@codemirror/language'),
  ])

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
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(defaultHighlightStyle),
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
          if (update.docChanged && tabs.activeId) {
            tabs.updateContent(tabs.activeId, update.state.doc.toString())
          }
        }),
      ],
    }),
  })
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
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc } })
    }
  }
)

onBeforeUnmount(() => {
  view?.destroy()
  view = null
})

function focusSearch(): void {
  if (view) {
    view.focus()
    openSearchPanel(view)
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
