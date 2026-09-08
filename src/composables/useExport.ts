import { exportHtmlRuntime } from '@/lib/export/exportRuntime'

export async function exportCurrentHtml(title: string, bodyHtml: string, theme: import('@/types').Theme): Promise<void> {
  try {
    await exportHtmlRuntime(title, bodyHtml, theme)
  } catch (err) {
    console.error('导出 HTML 失败', err)
    const detail = err instanceof Error ? err.message : String(err)
    window.alert(`导出 HTML 失败：${detail}`)
  }
}
