import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import githubLightCss from 'github-markdown-css/github-markdown-light.css?raw'
import githubDarkCss from 'github-markdown-css/github-markdown-dark.css?raw'
import katexCss from 'katex/dist/katex.min.css?raw'
import markdownCss from '@/styles/markdown.css?raw'
import themeCss from '@/styles/theme.css?raw'
import { buildStandaloneHtml } from './exportHtml'
import type { Theme } from '@/types'

const fontUrls = import.meta.glob('/node_modules/katex/dist/fonts/*.woff2', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const FONT_TIMEOUT_MS = 1500

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function fetchWithTimeout(url: string): Promise<Response> {
  // 不依赖 fetch 实现遵守 AbortSignal：用 Promise.race 强制超时，任何环境都生效
  const response = fetch(url)
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('font fetch timeout')), FONT_TIMEOUT_MS)
  })
  try {
    return await Promise.race([response, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

// 字体内嵌是增强项：任何字体失败/超时都降级跳过，绝不让单个字体阻塞整个导出
async function loadKatexFonts(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    Object.entries(fontUrls).map(async ([path, url]) => {
      const file = path.split('/').pop()!
      try {
        const response = await fetchWithTimeout(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        out[file] = await blobToDataUri(await response.blob())
      } catch (err) {
        console.warn(`KaTeX 字体 ${file} 内嵌失败，导出将使用回退字体`, err)
      }
    })
  )
  return out
}

export async function exportHtmlRuntime(title: string, bodyHtml: string, theme: Theme): Promise<void> {
  const base = title.replace(/\.(md|markdown)$/i, '')

  // 先弹出保存对话框：这是用户唯一必须完成的操作，绝不能被后续资源加载阻塞
  if ('__TAURI_INTERNALS__' in window) {
    const path = await save({
      filters: [{ name: 'HTML', extensions: ['html'] }],
      defaultPath: `${base}.html`,
    })
    if (!path) return // 用户取消，静默返回
    // 保存对话框成功后，再构建 HTML 并写入
    const katexFonts = await loadKatexFonts()
    const html = buildStandaloneHtml({
      title,
      bodyHtml,
      theme,
      githubCss: theme === 'dark' ? githubDarkCss : githubLightCss,
      katexCss,
      markdownCss,
      themeCss,
      katexFonts,
    })
    await writeTextFile(path, html)
    return
  }

  // 纯浏览器 dev 回退：构建后 Blob 下载
  const katexFonts = await loadKatexFonts()
  const html = buildStandaloneHtml({
    title,
    bodyHtml,
    theme,
    githubCss: theme === 'dark' ? githubDarkCss : githubLightCss,
    katexCss,
    markdownCss,
    themeCss,
    katexFonts,
  })
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${base}.html`
    anchor.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
