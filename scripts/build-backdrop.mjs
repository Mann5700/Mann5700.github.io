/**
 * Builds the responsive backdrop from the full-resolution source plate.
 *
 * Source (not committed — 14 MB):
 *   assets-src/crab-nebula.jpg
 *   https://upload.wikimedia.org/wikipedia/commons/0/00/Crab_Nebula.jpg
 *   NASA, ESA, J. Hester and A. Loll (Arizona State University). Public domain.
 *
 * Run `npm run backdrop` after replacing the source. Output is committed, so
 * the build itself never needs the original.
 */
import { mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const SOURCE = path.join(ROOT, 'assets-src', 'crab-nebula.jpg');
const OUT = path.join(ROOT, 'public', 'images', 'nebula');

/** Displayed at up to ~105vh wide, so these cover 1x and 2x on real screens. */
const WIDTHS = [480, 720, 1024, 1440, 1920, 2560];

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(
      `Source plate not found at assets-src/crab-nebula.jpg.\n` +
        `Download it first — see the comment at the top of this file.`,
    );
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  for (const file of await readdir(OUT)) {
    if (/^crab-\d+\.(avif|webp)$/.test(file)) await unlink(path.join(OUT, file));
  }

  const meta = await sharp(SOURCE).metadata();
  console.log(`Source: ${meta.width}x${meta.height}\n`);

  let total = 0;
  for (const width of WIDTHS) {
    // A small lift in saturation and black point keeps the gas vivid once the
    // plate is screen-blended over the page background.
    const base = sharp(SOURCE)
      .resize(width, width, { fit: 'cover', kernel: 'lanczos3' })
      .modulate({ saturation: 1.12 })
      .linear(1.06, -6);

    const avif = path.join(OUT, `crab-${width}.avif`);
    const webp = path.join(OUT, `crab-${width}.webp`);
    await base.clone().avif({ quality: 52, effort: 6, chromaSubsampling: '4:2:0' }).toFile(avif);
    await base.clone().webp({ quality: 74, effort: 6 }).toFile(webp);

    const a = (await stat(avif)).size;
    const w = (await stat(webp)).size;
    total += a;
    console.log(`  ${String(width).padStart(4)}px   avif ${kb(a).padStart(8)}   webp ${kb(w).padStart(8)}`);
  }

  // A 24px plate inlined as the instant placeholder behind the real image.
  const blur = await sharp(SOURCE)
    .resize(24, 24, { fit: 'cover' })
    .modulate({ saturation: 1.12 })
    .webp({ quality: 60 })
    .toBuffer();

  console.log(`\nTotal AVIF: ${kb(total)}`);
  console.log(`LQIP (paste into Cosmos.astro if it changes):\ndata:image/webp;base64,${blur.toString('base64')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
