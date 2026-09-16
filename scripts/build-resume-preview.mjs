/**
 * Converts the rendered resume pages into the web formats the in-page viewer
 * serves. Run as the second half of `npm run resume`.
 */
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const SRC = path.join(ROOT, 'assets-src', 'resume-preview');
const OUT = path.join(ROOT, 'public', 'resume');

/** A US Letter page reads comfortably at these widths on 1x and 2x screens. */
const WIDTHS = [900, 1600];

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function main() {
  if (!existsSync(SRC)) {
    console.error('No rendered pages found. Run `python scripts/redact-resume.py` first.');
    process.exit(1);
  }

  const pages = (await readdir(SRC)).filter((f) => /^page-\d+\.png$/.test(f)).sort();
  if (!pages.length) {
    console.error(`No page-*.png files in ${path.relative(ROOT, SRC)}.`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  for (const file of await readdir(OUT)) {
    if (/^preview-\d+-\d+\.(avif|webp)$/.test(file)) await unlink(path.join(OUT, file));
  }

  for (const file of pages) {
    const n = Number(file.match(/\d+/)[0]);
    for (const width of WIDTHS) {
      const base = sharp(path.join(SRC, file)).resize(width, null, { kernel: 'lanczos3' });
      const avif = path.join(OUT, `preview-${n}-${width}.avif`);
      const webp = path.join(OUT, `preview-${n}-${width}.webp`);
      await base.clone().avif({ quality: 62, effort: 6 }).toFile(avif);
      await base.clone().webp({ quality: 86, effort: 6 }).toFile(webp);
      console.log(
        `  page ${n} @ ${width}px   avif ${kb((await stat(avif)).size).padStart(8)}` +
          `   webp ${kb((await stat(webp)).size).padStart(8)}`,
      );
    }
  }

  console.log(`\nWrote previews for ${pages.length} page(s) to public/resume/.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
