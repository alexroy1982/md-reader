import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Tauri WebView2 不支持 Blob/锚点下载（静默无反应），
// 导出必须走保存对话框 + fs 写入；纯浏览器 dev 才回退 Blob。
const mockSave = vi.fn()
const mockWriteTextFile = vi.fn()

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: (...args: unknown[]) => mockSave(...args),
  open: vi.fn(),
}))
vi.mock('@tauri-apps/plugin-fs', () => ({
  writeTextFile: (...args: unknown[]) => mockWriteTextFile(...args),
  readTextFile: vi.fn(),
}))

import { exportCurrentHtml } from './useExport'

beforeEach(() => {
  vi.clearAllMocks()
  // katex 字体加载走 fetch，测试环境用假 blob 顶替
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, blob: async () => new Blob(['font']) })))
  vi.spyOn(window, 'alert').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (window as Record<string, unknown>).__TAURI_INTERNALS__
})

describe('exportCurrentHtml（Tauri 环境）', () => {
  beforeEach(() => {
    ;(window as Record<string, unknown>).__TAURI_INTERNALS__ = {}
  })

  it('弹保存对话框并用 fs 写入完整 HTML', async () => {
    mockSave.mockResolvedValue('C:\\docs\\demo.html')
    mockWriteTextFile.mockResolvedValue(undefined)

    await exportCurrentHtml('demo.md', '<p>正文</p>', 'light')

    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: 'demo.html' })
    )
    expect(mockWriteTextFile).toHaveBeenCalledTimes(1)
    const [path, html] = mockWriteTextFile.mock.calls[0] as [string, string]
    expect(path).toBe('C:\\docs\\demo.html')
    expect(html).toContain('<p>正文</p>')
    expect(html).toContain('<!DOCTYPE html>')
  })

  it('用户取消保存对话框时不写文件、不报错', async () => {
    mockSave.mockResolvedValue(null)

    await exportCurrentHtml('demo.md', '<p>正文</p>', 'light')

    expect(mockWriteTextFile).not.toHaveBeenCalled()
    expect(window.alert).not.toHaveBeenCalled()
  })

  it('写入失败时提示而不是静默吞错', async () => {
    mockSave.mockResolvedValue('C:\\docs\\demo.html')
    mockWriteTextFile.mockRejectedValue(new Error('denied'))

    await exportCurrentHtml('demo.md', '<p>正文</p>', 'light')

    expect(window.alert).toHaveBeenCalled()
  })
})

describe('exportCurrentHtml（纯浏览器 dev 回退）', () => {
  it('走 Blob 下载且不触碰 tauri fs', async () => {
    const createObjectURL = vi.fn(() => 'blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await exportCurrentHtml('demo.md', '<p>正文</p>', 'light')

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(mockSave).not.toHaveBeenCalled()
    expect(mockWriteTextFile).not.toHaveBeenCalled()
  })
})
