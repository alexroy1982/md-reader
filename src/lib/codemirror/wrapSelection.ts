import type { EditorState } from '@codemirror/state'

export interface WrapChange {
  from: number
  to: number
  insert: string
}

export function wrapSelection(state: EditorState, from: number, to: number, marker: string): WrapChange {
  const selected = state.sliceDoc(from, to)
  const wrapped =
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  const insert = wrapped
    ? selected.slice(marker.length, selected.length - marker.length)
    : marker + selected + marker
  return { from, to, insert }
}
