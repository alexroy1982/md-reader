// tauri build 之后调用：把最终交付物从深层构建目录汇总到根目录 dist/
// 用法：npm run dist（= tauri build + 本脚本）
import fs from 'node:fs'
import path from 'node:path'

const conf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'))
const v = conf.version
const outDir = 'dist'
fs.mkdirSync(outDir, { recursive: true })

const jobs = [
  ['src-tauri/target/release/md-reader.exe', `md-reader_${v}_x64-portable.exe`],
  [`src-tauri/target/release/bundle/nsis/MD Reader_${v}_x64-setup.exe`, `MD.Reader_${v}_x64-setup.exe`],
]

for (const [src, name] of jobs) {
  if (!fs.existsSync(src)) {
    console.error(`缺少产物: ${src}（请先 npm run tauri build）`)
    process.exit(1)
  }
  fs.copyFileSync(src, path.join(outDir, name))
  console.log(`dist/${name}  (${Math.round(fs.statSync(path.join(outDir, name)).size / 1024)}KB)`)
}
