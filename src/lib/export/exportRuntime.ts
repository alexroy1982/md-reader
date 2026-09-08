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

function blobToDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function loadKatexFonts(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    Object.entries(fontUrls).map(async ([path, url]) => {
      const file = path.split('/').pop()!
      const response = await fetch(url)
      if (!response.ok) throw new Error(`KaTeX 字体加载失败：${file} (${response.status})`)
      out[file] = await blobToDataUri(await response.blob())
    })
  )
  return out
}

export async function exportHtmlRuntime(title: string, bodyHtml: string, theme: Theme): Promise<void> {
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
  const base = title.replace(/\.(md|markdown)$/i, '')

  if ('__TAURI_INTERNALS__' in window) {
    const path = await save({
      filters: [{ name: 'HTML', extensions: ['html'] }],
      defaultPath: `${base}.html`,
    })
    if (!path) return
    await writeTextFile(path, html)
    return
  }

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
