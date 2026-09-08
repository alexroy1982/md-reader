import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// 回归：macOS 风格工具栏只保留侧边栏三条杠按钮，不再有伪红黄绿灯和重复的文档标题
const toolbarSource = readFileSync('src/components/Toolbar.vue', 'utf-8')

describe('Toolbar 结构回归', () => {
  it('不包含 traffic-lights（伪 mac 红黄绿灯）', () => {
    expect(toolbarSource).not.toContain('traffic-lights')
  })

  it('不包含 document-title（与 TabBar 重复的文档标题）', () => {
    expect(toolbarSource).not.toContain('document-title')
  })

  it('保留侧边栏三条杠按钮与 toggle-sidebar 事件', () => {
    expect(toolbarSource).toContain('☰')
    expect(toolbarSource).toContain('toggle-sidebar')
    expect(toolbarSource).toContain('sidebarOpen')
  })
})
