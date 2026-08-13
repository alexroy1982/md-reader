import { open, save } from '@tauri-apps/plugin-dialog'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'

const MD_FILTERS = [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }]

export async function openMarkdownDialog(): Promise<string | null> {
  const selected = await open({ multiple: false, filters: MD_FILTERS })
  return typeof selected === 'string' ? selected : null
}

export async function saveMarkdownDialog(): Promise<string | null> {
  const selected = await save({ filters: MD_FILTERS, defaultPath: 'untitled.md' })
  return selected ?? null
}

export function readMarkdown(path: string): Promise<string> {
  return readTextFile(path) // 默认 UTF-8
}

export function writeMarkdown(path: string, content: string): Promise<void> {
  return writeTextFile(path, content)
}
