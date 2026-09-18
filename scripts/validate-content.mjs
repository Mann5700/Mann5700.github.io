/**
 * Content pre-flight. Runs before the build and fails loudly with a message a
 * human can act on, instead of a stack trace from deep inside a bundler.
 *
 * Schema validation itself is handled by Zod in src/content.config.ts. This
 * script covers the things a schema cannot see: missing files on disk, broken
 * internal links and empty collections.
 */
import { readdir, access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(new URL('../package.json', import.meta.url)));
const content = path.join(root, 'src', 'content');
const publicDir = path.join(root, 'public');

const problems = [];
const notes = [];

const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

async function listMarkdown(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.md') && !e.name.startsWith('_'))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------- required content */

const required = [
  ['profile', 1, 1],
  ['experience', 1, Infinity],
  ['projects', 1, Infinity],
  ['skills', 1, Infinity],
];

for (const [collection, min, max] of required) {
  const files = await listMarkdown(path.join(content, collection));
  if (files.length < min) {
    problems.push(
      `Collection "${collection}" is empty. Add at least ${min} file to src/content/${collection}/ ` +
        `(copy _template.md and rename it).`,
    );
  }
  if (files.length > max) {
    problems.push(
      `Collection "${collection}" has ${files.length} files but only ${max} is allowed. ` +
        `Keep a single file in src/content/${collection}/.`,
    );
  }
}

/* ---------------------------------------------------------- asset checks */

const profileFiles = await listMarkdown(path.join(content, 'profile'));
for (const file of profileFiles) {
  const raw = await readFile(file, 'utf8');
  const href = raw.match(/^\s+href:\s*(\S+)/m)?.[1]?.replace(/^['"]|['"]$/g, '');
  if (href && href.startsWith('/')) {
    const served = path.join(publicDir, href);
    if (!(await exists(served))) {
      problems.push(
        `${rel(file)} points resume.href at "${href}", but public${href} does not exist. ` +
          `Put the PDF at public${href} or update the path.`,
      );
    } else {
      // The published resume must never be the unredacted working copy: that
      // one still carries a phone number. See README § 5.7.
      const working = (await readdir(root, { withFileTypes: true }))
        .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.pdf'))
        .map((e) => path.join(root, e.name));
      for (const candidate of working) {
        const [a, b] = await Promise.all([readFile(candidate), readFile(served)]);
        if (a.equals(b)) {
          problems.push(
            `public${href} is byte-identical to "${path.basename(candidate)}", your private ` +
              `working copy. That file still contains your phone number. ` +
              `Run "npm run resume" to publish a redacted copy instead.`,
          );
        }
      }

      // Word stamps the authoring account name — which embeds the corporate
      // employee ID — into the PDF metadata. redact-resume.py clears it.
      if ((await readFile(served)).includes('Microsoft')) {
        problems.push(
          `public${href} still carries Word's authoring metadata, which includes the ` +
            `corporate account name. Run "npm run resume" to republish it.`,
        );
      }
    }
  }
}

const projectFiles = await listMarkdown(path.join(content, 'projects'));
for (const file of projectFiles) {
  const raw = await readFile(file, 'utf8');
  const image = raw.match(/^image:\s*(\S+)/m)?.[1]?.replace(/^['"]|['"]$/g, '');
  if (image && image.startsWith('/') && !(await exists(path.join(publicDir, image)))) {
    problems.push(
      `${rel(file)} references image "${image}", but public${image} does not exist.`,
    );
  }
  if (!/^links:/m.test(raw)) {
    notes.push(`${rel(file)} has no links — the mission page will have no Source button.`);
  }
}

/* -------------------------------------------------------------- reporting */

if (notes.length) {
  console.log('\nContent notes:');
  for (const note of notes) console.log(`  · ${note}`);
}

if (problems.length) {
  console.error('\nContent problems found:\n');
  for (const problem of problems) console.error(`  ✖ ${problem}\n`);
  console.error(`${problems.length} problem(s). See README.md → "Updating content".\n`);
  process.exit(1);
}

console.log(`\nContent OK — ${projectFiles.length} projects, ${profileFiles.length} profile.\n`);
