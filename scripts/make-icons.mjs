import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BACKGROUND = [31, 58, 99];

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function icon(size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);

  const barWidth = size * 0.14;
  const gap = size * 0.08;
  const baseline = size * 0.78;
  const heights = [0.3, 0.46, 0.62].map((ratio) => size * ratio);
  const groupWidth = barWidth * 3 + gap * 2;
  const startX = (size - groupWidth) / 2;

  const bars = heights.map((height, index) => {
    const left = startX + index * (barWidth + gap);
    return { left, right: left + barWidth, bottom: baseline, top: baseline - height };
  });

  for (let y = 0; y < size; y += 1) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = y * stride + 1 + x * 4;
      const lit = bars.some(
        (bar) => x >= bar.left && x <= bar.right && y >= bar.top && y <= bar.bottom
      );

      raw[offset] = lit ? 255 : BACKGROUND[0];
      raw[offset + 1] = lit ? 255 : BACKGROUND[1];
      raw[offset + 2] = lit ? 255 : BACKGROUND[2];
      raw[offset + 3] = 255;
    }
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });

for (const size of [192, 512]) {
  const file = `public/icon-${size}.png`;
  writeFileSync(file, icon(size));
  console.log(`wrote ${file}`);
}

const apple = icon(180);
writeFileSync("public/apple-icon.png", apple);
console.log("wrote public/apple-icon.png");
