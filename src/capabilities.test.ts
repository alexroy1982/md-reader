import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// 回归守卫：App.vue 关窗拦截在「不保存/保存」分支调用 window.close()，
// core:window:default 不含 allow-close，缺它会导致 preventDefault 后窗口永远无法关闭。
const caps = JSON.parse(
  readFileSync('src-tauri/capabilities/default.json', 'utf-8')
) as { permissions: unknown[] }

describe('tauri capabilities', () => {
  it('包含 core:window:allow-close（关窗拦截的程序化 close 依赖它）', () => {
    expect(caps.permissions).toContain('core:window:allow-close')
  })
})
