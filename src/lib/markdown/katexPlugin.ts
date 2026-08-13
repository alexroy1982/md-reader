import type MarkdownIt from 'markdown-it'
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.mjs'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import katex from 'katex'

const DOLLAR = 0x24 // $
const BACKSLASH = 0x5c // \

function renderKatex(src: string, displayMode: boolean): string {
  return katex.renderToString(src, {
    displayMode,
    throwOnError: false,
    output: 'html',
  })
}

// 行内规则：$...$ 与 $$...$$（同段内）
function mathInline(state: StateInline, silent: boolean): boolean {
  const start = state.pos
  if (state.src.charCodeAt(start) !== DOLLAR) return false
  if (start > 0 && state.src.charCodeAt(start - 1) === BACKSLASH) return false

  const isDouble = state.src.charCodeAt(start + 1) === DOLLAR
  const openLen = isDouble ? 2 : 1
  const afterOpen = state.src.charAt(start + openLen)
  // 开符号后紧跟空白或结尾 → 不是公式（避免 "$5 和 $6" 误判）
  if (afterOpen === '' || afterOpen === ' ' || afterOpen === '\n') return false

  const closer = isDouble ? '$$' : '$'
  let scan = start + openLen
  let closePos = -1
  while ((scan = state.src.indexOf(closer, scan)) !== -1) {
    if (state.src.charCodeAt(scan - 1) === BACKSLASH) {
      scan += closer.length
      continue
    }
    if (!isDouble) {
      const before = state.src.charAt(scan - 1)
      if (before === ' ' || before === '\n') {
        scan += 1
        continue
      }
    }
    closePos = scan
    break
  }
  if (closePos === -1) return false

  const content = state.src.slice(start + openLen, closePos)
  if (content.trim() === '') return false
  if (!isDouble && content.includes('\n')) return false

  if (!silent) {
    const token = state.push('math_inline', '', 0)
    token.content = content
    token.markup = closer
    token.meta = { displayMode: isDouble }
  }
  state.pos = closePos + openLen
  return true
}

// 块级规则：独占段落的 $$...$$（单行或多行）
function mathBlock(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine]
  const maxPos = state.eMarks[startLine]
  if (startPos + 1 >= maxPos) return false
  if (state.src.charCodeAt(startPos) !== DOLLAR) return false
  if (state.src.charCodeAt(startPos + 1) !== DOLLAR) return false

  // 单行形式：$$...$$ 且行尾无其他内容
  const firstLineRest = state.src.slice(startPos + 2, maxPos)
  const inlineClose = firstLineRest.indexOf('$$')
  if (inlineClose !== -1 && firstLineRest.slice(inlineClose + 2).trim() === '') {
    if (firstLineRest.slice(0, inlineClose).trim() === '') return false
    if (silent) return true
    const token = state.push('math_block', '', 0)
    token.block = true
    token.content = firstLineRest.slice(0, inlineClose)
    token.map = [startLine, startLine + 1]
    state.line = startLine + 1
    return true
  }

  // 多行形式：寻找内容仅为 $$ 的收尾行
  let closeLine = -1
  for (let line = startLine + 1; line < endLine; line++) {
    const pos = state.bMarks[line] + state.tShift[line]
    const max = state.eMarks[line]
    if (state.src.slice(pos, max).trim() === '$$') {
      closeLine = line
      break
    }
  }
  if (closeLine === -1) return false
  if (silent) return true

  const content = state.src.slice(startPos + 2, state.bMarks[closeLine])
  if (content.trim() === '') return false
  if (silent) return true

  const token = state.push('math_block', '', 0)
  token.block = true
  token.content = content
  token.map = [startLine, closeLine + 1]
  state.line = closeLine + 1
  return true
}

export function katexPlugin(md: MarkdownIt): void {
  md.inline.ruler.after('escape', 'math_inline', mathInline)
  md.block.ruler.before('fence', 'math_block', mathBlock)

  md.renderer.rules.math_inline = (tokens, idx) =>
    `<span class="math math-inline">${renderKatex(tokens[idx].content, tokens[idx].meta?.displayMode === true)}</span>`

  md.renderer.rules.math_block = (tokens, idx) =>
    `<div class="math math-block">${renderKatex(tokens[idx].content, true)}</div>\n`
}
