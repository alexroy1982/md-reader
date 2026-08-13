import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { wrapSelection } from './wrapSelection'

const state = EditorState.create({ doc: 'hello world' })

describe('wrapSelection', () => {
  it('用 ** 包裹选区', () => {
    const r = wrapSelection(state, 0, 5, '**')
    expect(r.insert).toBe('**hello**')
  })
  it('已包裹时再次调用解包裹', () => {
    const s2 = EditorState.create({ doc: '**hello**' })
    const r = wrapSelection(s2, 0, 9, '**')
    expect(r.insert).toBe('hello')
  })
  it('空选区插入成对标记', () => {
    const r = wrapSelection(state, 0, 0, '*')
    expect(r.insert).toBe('**')
  })
})
