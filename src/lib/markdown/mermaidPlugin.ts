import type MarkdownIt from 'markdown-it'

export function mermaidPlugin(md: MarkdownIt): void {
  const defaultFence = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.info.trim().toLowerCase() === 'mermaid') {
      const source = md.utils.escapeHtml(token.content)
      return `<div class="mermaid-placeholder"><pre class="mermaid-source">${source}</pre></div>\n`
    }
    return defaultFence(tokens, idx, options, env, self)
  }
}
