/**
 * Renders the social preview image and the PNG app icons.
 *
 * Run `npm run og` after changing your name, title or headline. The output is
 * committed to the repo, so the build itself never depends on this script.
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const profilePath = path.join(root, 'src', 'content', 'profile', 'profile.md');

/** Minimal frontmatter reader — only the scalar keys this script needs. */
async function readProfile() {
  const raw = await readFile(profilePath, 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error(`No frontmatter found in ${profilePath}`);

  const lines = match[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const scalar = line.match(/^([a-z]+):\s*(.*)$/i);
    if (!scalar) continue;
    const [, key, value] = scalar;
    if (value === '>-' || value === '>' || value === '|') {
      const block = [];
      for (let j = i + 1; j < lines.length && /^\s{2,}\S/.test(lines[j]); j++) {
        block.push(lines[j].trim());
        i = j;
      }
      out[key] = block.join(' ');
    } else if (value) {
      out[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }
  return out;
}

const escape = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Greedy wrap using an approximate advance width for the display face. */
function wrap(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function stars(count, seed) {
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rand() * 1200;
    const y = rand() * 630;
    const r = 0.5 + rand() * 1.3;
    const o = 0.18 + rand() * 0.55;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
  }
  return out;
}

function ogSvg(profile) {
  const family = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
  const mono = "'Consolas', 'Courier New', monospace";
  const headline = wrap(profile.headline ?? '', 52).slice(0, 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#05060a" stop-opacity=".95"/>
      <stop offset="52%" stop-color="#05060a" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="50%">
      <stop offset="45%" stop-color="#05060a" stop-opacity="0"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity=".55"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#vig)"/>
  <rect width="840" height="630" fill="url(#fade)"/>

  <g transform="translate(84 172)">
    <text font-family="${mono}" font-size="20" letter-spacing="6" fill="#8b93a6">MANN5700</text>
    <text y="104" font-family="${family}" font-size="96" font-weight="300" letter-spacing="-3" fill="#ffffff">${escape(profile.name ?? '')}</text>
    <text y="160" font-family="${mono}" font-size="22" letter-spacing="5" fill="#ff9d5c">${escape((profile.role ?? '').toUpperCase())}</text>
    ${headline
      .map(
        (line, i) =>
          `<text y="${232 + i * 40}" font-family="${family}" font-size="29" font-weight="300" fill="#9aa3b8">${escape(line)}</text>`,
      )
      .join('\n    ')}
    <line x1="0" y1="${252 + headline.length * 40}" x2="120" y2="${252 + headline.length * 40}" stroke="#ff9d5c" stroke-width="2"/>
  </g>
</svg>`;
}

/** The star field that sits behind the plate. */
function starsSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#05060a"/>
  <g>${stars(170, 987654321)}</g>
</svg>`;
}

/** Feathers the square plate into deep space, matching the site's CSS mask. */
function plateMaskSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <defs>
    <radialGradient id="m" cx="50%" cy="50%">
      <stop offset="38%" stop-color="#fff" stop-opacity="1"/>
      <stop offset="58%" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="74%" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#m)"/>
</svg>`;
}

/** Prefers the full-resolution source plate, falls back to a built derivative. */
async function platePath() {
  const candidates = [
    path.join(root, 'assets-src', 'crab-nebula.jpg'),
    path.join(root, 'public', 'images', 'nebula', 'crab-2560.webp'),
    path.join(root, 'public', 'images', 'nebula', 'crab-1440.webp'),
  ];
  for (const file of candidates) {
    try {
      await readFile(file);
      return file;
    } catch {
      /* try the next one */
    }
  }
  throw new Error('No nebula plate found. Run `npm run backdrop` first.');
}

/** The plate, resized and feathered exactly like the site's CSS mask. */
async function maskedPlate(size) {
  const source = await platePath();
  return sharp(source)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .modulate({ saturation: 1.12 })
    .linear(1.06, -6)
    .ensureAlpha()
    .composite([{ input: Buffer.from(plateMaskSvg(size)), blend: 'dest-in' }])
    .png()
    .toBuffer();
}

async function main() {
  const profile = await readProfile();

  await mkdir(path.join(root, 'public', 'og'), { recursive: true });
  await mkdir(path.join(root, 'public', 'icons'), { recursive: true });

  const PLATE = 780;
  const LEFT = 520;
  // sharp refuses overhanging layers, so the plate is cropped to the part of
  // the card it actually covers before compositing.
  const cropY = Math.round((PLATE - 630) / 2);
  const visible = await sharp(await maskedPlate(PLATE))
    .extract({ left: 0, top: cropY, width: Math.min(PLATE, 1200 - LEFT), height: 630 })
    .png()
    .toBuffer();

  await sharp(Buffer.from(starsSvg()))
    .composite([
      { input: visible, left: LEFT, top: 0, blend: 'screen' },
      { input: Buffer.from(ogSvg(profile)), left: 0, top: 0 },
    ])
    .png()
    .toFile(path.join(root, 'public', 'og', 'og.png'));

  // App icons crop the brightest part of the plate rather than redrawing it.
  const icons = [
    ['icons/apple-touch-icon.png', 180],
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
  ];
  for (const [file, size] of icons) {
    const inner = Math.round(size * 0.94);
    await sharp({
      create: { width: size, height: size, channels: 4, background: '#05060a' },
    })
      .composite([
        {
          input: await maskedPlate(inner),
          left: Math.round((size - inner) / 2),
          top: Math.round((size - inner) / 2),
          blend: 'screen',
        },
      ])
      .png()
      .toFile(path.join(root, 'public', file));
  }

  console.log(`Generated public/og/og.png and ${icons.length} icons from the Hubble plate.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
