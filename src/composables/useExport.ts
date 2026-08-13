import githubLightCss from 'github-markdown-css/github-markdown-light.css?raw'
import githubDarkCss from 'github-markdown-css/github-markdown-dark.css?raw'
import katexCss from 'katex/dist/katex.min.css?raw'
import markdownCss from '@/styles/markdown.css?raw'
import themeCss from '@/styles/theme.css?raw'
import { buildStandaloneHtml } from '@/lib/export/exportHtml'
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
      const res = await fetch(url)
      out[file] = await blobToDataUri(await res.blob())
    })
  )
  return out
}

export async function exportCurrentHtml(title: string, bodyHtml: string, theme: Theme): Promise<void> {
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
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\.(md|markdown)$/i, '')}.html`
  a.click()
  URL.revokeObjectURL(url)
}
