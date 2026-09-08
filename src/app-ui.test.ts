import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.vue', 'utf-8')

describe('App UI 回归', () => {
  it('不再向 Toolbar 传递 document-title（文档名只保留在 TabBar）', () => {
    expect(appSource).not.toContain('document-title')
    expect(appSource).not.toContain('documentTitle')
  })

  it('仍渲染 TabBar 与 WorkspaceSidebar 及侧边栏开关', () => {
    expect(appSource).toContain('<TabBar')
    expect(appSource).toContain('<WorkspaceSidebar')
    expect(appSource).toContain('toggle-sidebar')
  })

  it('编辑器按需挂载（默认阅读模式不挂载 Editor）', () => {
    expect(appSource).toContain('v-if="settings.editorVisible"')
  })
})
