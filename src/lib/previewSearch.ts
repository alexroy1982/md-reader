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

export function applyHighlights(matches: SearchMatch[]): AppliedHighlights {
  // 按节点分组、组内从后往前拆分：前面的命中偏移量在拆分中始终有效
  const byNode = new Map<Text, SearchMatch[]>()
  for (const m of matches) {
    const list = byNode.get(m.node)
    if (list) list.push(m)
    else byNode.set(m.node, [m])
  }
  const marks: HTMLElement[] = []
  for (const [node, list] of byNode) {
    // Map 迭代序 = 插入序 = 文档序（findMatches 按文档序遍历）
    const created: HTMLElement[] = []
    for (let i = list.length - 1; i >= 0; i--) {
      const { start, end } = list[i]
      node.splitText(end) // 尾段留在原处
      const mid = node.splitText(start) // mid 即命中区间，node 退化为前段
      const mark = document.createElement('mark')
      mark.className = 'pv-search-hit'
      mid.replaceWith(mark)
      mark.appendChild(mid)
      created.push(mark)
    }
    marks.push(...created.reverse()) // 组内从后往前创建，reverse 回文档序
  }
  return {
    marks,
    cleanup() {
      for (const mark of marks) {
        const parent = mark.parentNode
        if (!parent) continue // 已被 v-html 重渲染丢弃，跳过
        parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
        parent.normalize() // 重组拆散的相邻文本节点
      }
    },
  }
}
