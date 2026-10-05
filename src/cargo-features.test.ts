import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// 回归守卫：tauri-plugin-fs 的 watch/unwatch 命令在 watch Cargo feature 之后
// （plugin 源码 lib.rs 里 #[cfg(feature = "watch")]）。只声明版本号不开 feature
// 时，fs:allow-watch 权限依然存在（静态权限文件），构建与 capabilities 校验全绿，
// 但运行时 plugin:fs|watch 报 "Command watch not found"——2026-10-05 外部修改
// 自动刷新因此静默失效（注册失败被 catch 吞掉）。此测试锁定 feature 不丢失。
const cargoToml = readFileSync('src-tauri/Cargo.toml', 'utf-8')

describe('tauri-plugin-fs cargo features', () => {
  it('启用 watch feature（外部修改自动刷新依赖 plugin:fs|watch 命令）', () => {
    const depLine = cargoToml
      .split('\n')
      .find((l) => l.trimStart().startsWith('tauri-plugin-fs'))
    expect(depLine, 'Cargo.toml 中应存在 tauri-plugin-fs 依赖声明').toBeDefined()
    expect(depLine).toContain('features')
    expect(depLine).toMatch(/features\s*=\s*\[[^\]]*"watch"/)
  })
})
