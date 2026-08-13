import zlib from 'node:zlib'
import fs from 'node:fs'

const SIZE = 1024
// CRC32
const table = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4)
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
// 像素：深蓝底色 #0969da，中央白色 "M" 用简单矩形拼出
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1)
  raw[row] = 0 // filter: none
  for (let x = 0; x < SIZE; x++) {
    const o = row + 1 + x * 4
    let r = 9, g = 105, b = 218 // #0969da
    const inM =
      (x > 300 && x < 380 && y > 300 && y < 724) ||
      (x > 644 && x < 724 && y > 300 && y < 724) ||
      (x >= 380 && x < 512 && y > 300 && y < 300 + (x - 380) + 80 && y < 560) ||
      (x >= 512 && x < 644 && y > 300 && y < 300 + (644 - x) + 80 && y < 560)
    if (inM) { r = 255; g = 255; b = 255 }
    raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255
  }
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(SIZE, 0)
ihdr.writeUInt32BE(SIZE, 4)
ihdr[8] = 8; ihdr[9] = 6 // 8-bit RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
fs.mkdirSync('src-tauri/icons', { recursive: true })
fs.writeFileSync('src-tauri/icons/app-icon-source.png', png)
console.log('written src-tauri/icons/app-icon-source.png')
