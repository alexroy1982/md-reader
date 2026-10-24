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

  it('编辑器文档跟随标签内容变化（外部文件刷新后编辑器不残留旧文档）', () => {
    const editorSource = readFileSync('src/components/Editor.vue', 'utf-8')
    expect(editorSource).toMatch(/tabs\.activeId,\s*tabs\.activeTab\?\.content/)
  })

  it('预览搜索接线：重渲染重跑、导出剥离高亮、切回编辑模式自动关闭', () => {
    const previewSource = readFileSync('src/components/Preview.vue', 'utf-8')
    expect(previewSource).toContain('openSearch')
    expect(previewSource).toContain('pv-search-hit')
    expect(previewSource).toContain('searchOpen.value && searchQuery.value')
    expect(previewSource).toContain("querySelectorAll('mark.pv-search-hit')")
    expect(previewSource).toMatch(/watch\(\s*\(\) => settings\.editorVisible/)
  })

  it('Ctrl+F 分流：阅读模式走预览搜索，不再强制显示编辑器', () => {
    const handler = appSource.match(/search: \(\) => \{[\s\S]*?\n    \},/)
    expect(handler).toBeTruthy()
    expect(handler![0]).toContain('settings.editorVisible')
    expect(handler![0]).toContain('if (!settings.editorVisible)')
    expect(handler![0]).toContain('previewRef.value?.openSearch()')
    expect(handler![0]).toContain('editorRef.value?.focusSearch()')
    expect(handler![0]).not.toContain('setEditorVisible')
  })
})
