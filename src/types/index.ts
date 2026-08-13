export interface TocItem {
  level: 1 | 2 | 3
  text: string
  slug: string
}

export interface RenderResult {
  html: string
  toc: TocItem[]
}

export interface Tab {
  id: string
  title: string
  path: string | null
  content: string
  savedContent: string
}

export type Theme = 'light' | 'dark'

export interface RecentFile {
  path: string
  name: string
  openedAt: number
}
