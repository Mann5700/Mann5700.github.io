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
    <radialGradient id="disk" cx="50%" cy="50%">
      <stop offset="34%" stop-color="#ff9d5c" stop-opacity="0"/>
      <stop offset="41%" stop-color="#ffb27a" stop-opacity=".95"/>
      <stop offset="52%" stop-color="#ff7a3c" stop-opacity=".30"/>
      <stop offset="78%" stop-color="#d9662a" stop-opacity=".08"/>
      <stop offset="100%" stop-color="#d9662a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="dust" cx="20%" cy="85%">
      <stop offset="0%" stop-color="#3a5a8c" stop-opacity=".28"/>
      <stop offset="100%" stop-color="#3a5a8c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#05060a" stop-opacity=".96"/>
      <stop offset="62%" stop-color="#05060a" stop-opacity=".55"/>
      <stop offset="100%" stop-color="#05060a" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="#05060a"/>
  <rect width="1200" height="630" fill="url(#dust)"/>
  <g>${stars(150, 987654321)}</g>

  <g transform="translate(925 300)">
    <ellipse rx="255" ry="74" fill="none" stroke="#ff9d5c" stroke-opacity=".16" stroke-width="2"/>
    <circle r="230" fill="url(#disk)"/>
    <circle r="78" fill="#05060a"/>
    <circle r="86" fill="none" stroke="#ffc48f" stroke-opacity=".9" stroke-width="2.5"/>
  </g>

  <rect width="820" height="630" fill="url(#fade)"/>

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

async function main() {
  const profile = await readProfile();

  await mkdir(path.join(root, 'public', 'og'), { recursive: true });
  await mkdir(path.join(root, 'public', 'icons'), { recursive: true });

  const svg = ogSvg(profile);
  await writeFile(path.join(root, 'public', 'og', 'og.svg'), svg, 'utf8');
  await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(path.join(root, 'public', 'og', 'og.png'));

  const favicon = await readFile(path.join(root, 'public', 'favicon.svg'));
  const icons = [
    ['icons/apple-touch-icon.png', 180],
    ['icons/icon-192.png', 192],
    ['icons/icon-512.png', 512],
  ];
  for (const [file, size] of icons) {
    await sharp(favicon, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(path.join(root, 'public', file));
  }

  console.log(`Generated public/og/og.png and ${icons.length} icons.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
