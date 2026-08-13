import type MarkdownIt from 'markdown-it'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'

// 结构：bullet_list_open > list_item_open > paragraph_open > inline > children[0]=text
export function taskListsPlugin(md: MarkdownIt): void {
  md.core.ruler.push('task_lists', (state: StateCore) => {
    const tokens = state.tokens
    for (let i = 2; i < tokens.length; i++) {
      const inline = tokens[i]
      if (inline.type !== 'inline') continue
      if (tokens[i - 1].type !== 'paragraph_open') continue
      if (tokens[i - 2].type !== 'list_item_open') continue
      const first = inline.children?.[0]
      if (!first || first.type !== 'text') continue
      const m = /^\[([ xX])\]\s+/.exec(first.content)
      if (!m) continue
      const checked = m[1].toLowerCase() === 'x'
      first.content = first.content.slice(m[0].length)
      const checkbox = new state.Token('task_checkbox', 'input', 0)
      checkbox.meta = { checked }
      inline.children!.unshift(checkbox)
      tokens[i - 2].attrJoin('class', 'task-list-item')
    }
    return false
  })

  md.renderer.rules.task_checkbox = (tokens, idx) =>
    `<input type="checkbox" disabled${tokens[idx].meta?.checked ? ' checked' : ''}> `
}
