// 预览区文本搜索核心：TreeWalker 遍历文本节点并计算命中区间。
// 无 Vue 依赖，可独立单测。大小写不敏感，不支持跨元素边界匹配（v1 已知限制）。

export interface SearchMatch {
  node: Text
  start: number
  end: number
}

export interface AppliedHighlights {
  /** 全部命中对应的 mark，按文档序排列，与 SearchMatch 一一对应 */
  marks: HTMLElement[]
  /** 还原 DOM：unwrap 所有 mark + normalize 重组文本节点；对已脱离文档的 mark 安全跳过 */
  cleanup: () => void
}

const SKIP_SELECTOR = 'svg, script, style'

export function findMatches(root: ParentNode, query: string): SearchMatch[] {
  if (!query) return []
  const needle = query.toLowerCase()
  const matches: SearchMatch[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = (node as Text).parentElement
      // mermaid 图是 svg、代码高亮以外的脚本样式都在这三类里，整棵跳过
      if (parent && parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT
      return NodeFilter.FILTER_ACCEPT
    },
  })
  let current = walker.nextNode() as Text | null
  while (current) {
    const haystack = current.data.toLowerCase()
    let from = 0
    for (;;) {
      const idx = haystack.indexOf(needle, from)
      if (idx === -1) break
      matches.push({ node: current, start: idx, end: idx + needle.length })
      from = idx + needle.length // 非重叠命中
    }
    current = walker.nextNode() as Text | null
  }
  return matches
}
