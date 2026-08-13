export interface ShortcutHandlers {
  save: () => void
  open: () => void
  newTab: () => void
  print: () => void
  search: () => void
  nextTab: () => void
  prevTab: () => void
}

export function registerShortcuts(handlers: ShortcutHandlers): () => void {
  const onKeydown = (e: KeyboardEvent): void => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && k === 's') { e.preventDefault(); handlers.save() }
    else if (mod && k === 'o') { e.preventDefault(); handlers.open() }
    else if (mod && k === 'n') { e.preventDefault(); handlers.newTab() }
    else if (mod && k === 'p') { e.preventDefault(); handlers.print() }
    else if (mod && k === 'f' && !(e.target instanceof HTMLElement && e.target.closest('.cm-editor'))) {
      // 编辑器内 Ctrl+F 由 CodeMirror 自己的 searchKeymap 处理
      e.preventDefault(); handlers.search()
    }
    else if (e.altKey && e.key === 'ArrowLeft') { e.preventDefault(); handlers.prevTab() }
    else if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); handlers.nextTab() }
  }
  window.addEventListener('keydown', onKeydown)
  return () => window.removeEventListener('keydown', onKeydown)
}
