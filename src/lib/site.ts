/**
 * Site-level helpers. Nothing here reaches the network at runtime.
 */

/** Join a path onto the configured base so links survive a project sub-path. */
export function url(path: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const clean = path.startsWith('/') ? path.slice(1) : path;
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${clean}`.replace(/\/{2,}/g, '/');
}

/** Absolute URL for canonical tags, Open Graph and structured data. */
export function absolute(path: string, site: URL | undefined): string {
  const origin = site?.origin ?? 'https://mann5700.github.io';
  return new URL(url(path), origin).href;
}

export const SECTIONS = [
  { id: 'origin', index: '01', label: 'Origin' },
  { id: 'trajectory', index: '02', label: 'Trajectory' },
  { id: 'missions', index: '03', label: 'Missions' },
  { id: 'constellation', index: '04', label: 'Constellation' },
  { id: 'signal', index: '05', label: 'Signal' },
] as const;

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2025-04" → "Apr 2025". "2025" → "2025". */
export function formatPeriod(value: string): string {
  const [year, month] = value.split('-');
  if (!month) return year!;
  const name = MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : year!;
}

export function formatRange(start: string, end?: string, current = false): string {
  const from = formatPeriod(start);
  if (current || !end) return `${from} — Present`;
  return `${from} — ${formatPeriod(end)}`;
}

/** Whole years and months between two `YYYY-MM` markers, for duration labels. */
export function durationLabel(start: string, end?: string): string {
  const parse = (v: string) => {
    const [y, m] = v.split('-');
    return { y: Number(y), m: m ? Number(m) : 1 };
  };
  const a = parse(start);
  const b = end ? parse(end) : { y: new Date().getUTCFullYear(), m: new Date().getUTCMonth() + 1 };
  let months = (b.y - a.y) * 12 + (b.m - a.m) + 1;
  if (months < 1) months = 1;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years && rest) return `${years} yr ${rest} mo`;
  if (years) return `${years} yr`;
  return `${rest} mo`;
}

/** Normalises the two shapes a skill item is allowed to take in Markdown. */
export type SkillItem = { name: string; note?: string; core: boolean };

export function normalizeSkill(item: string | { name: string; note?: string; core?: boolean }): SkillItem {
  return typeof item === 'string'
    ? { name: item, core: false }
    : { name: item.name, note: item.note, core: item.core ?? false };
}
