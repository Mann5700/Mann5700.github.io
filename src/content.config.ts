import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * CONTENT MODEL
 * -------------
 * Every collection below is plain Markdown with frontmatter. Files whose name
 * starts with `_` (e.g. `_template.md`) are ignored, so templates can live
 * beside real content. If a required field is missing or mistyped, the build
 * fails with the collection, the file name, and the exact field.
 *
 * See README.md → "Updating content" for a field-by-field guide.
 */

/** A required, non-empty string that explains itself when it is missing. */
const text = (field: string, hint: string) =>
  z
    .string({
      required_error: `Missing required field "${field}". ${hint}`,
      invalid_type_error: `Field "${field}" must be text. ${hint}`,
    })
    .min(1, `Field "${field}" cannot be empty. ${hint}`);

/** `YYYY-MM` or `YYYY`. Accepts an unquoted year, which YAML reads as a number. */
const yearMonth = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z
    .string()
    .regex(/^\d{4}(-\d{2})?$/, 'Use "YYYY-MM" (e.g. 2025-04) or "YYYY" (e.g. 2025).'),
);

const link = z.string().url('Must be a full URL including https://');

/** A short display value such as "95%" or 7 — YAML may hand us either type. */
const display = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z.string().min(1),
);

const technologies = z
  .array(z.string().min(1))
  .min(1, 'List at least one technology, e.g. technologies: ["Python", "React"]');

/* ------------------------------------------------------------------ profile */

const profile = defineCollection({
  loader: glob({ base: './src/content/profile', pattern: '**/[^_]*.md' }),
  schema: z.object({
    name: text('name', 'Your full name.'),
    /** Shown under the name in the hero. Keep it short. */
    role: text('role', 'Your current title, e.g. "Software Engineer".'),
    /** The one-line positioning statement. Aim for < 140 characters. */
    headline: text('headline', 'One sentence describing what you build.'),
    /** 1–2 sentences used for SEO descriptions and social previews. */
    summary: z.string().min(40, 'Write at least ~40 characters — this is your meta description.'),
    location: text('location', 'City, State.'),
    email: z.string().email('Field "email" must be a valid email address.'),
    /** Optional status pill in the hero. Delete the line to hide it. */
    availability: z.string().optional(),
    resume: z.object({
      href: text('resume.href', 'Path to the PDF under /public.'),
      label: z.string().default('Resume'),
      updated: yearMonth.optional(),
    }),
    socials: z
      .array(
        z.object({
          label: z.string().min(1),
          href: link,
          handle: z.string().optional(),
        }),
      )
      .default([]),
    /** Telemetry strip under the hero. Each entry is a value plus a label. */
    metrics: z
      .array(z.object({ value: display, label: z.string().min(1) }))
      .max(4, 'Four metrics maximum — more than that stops reading as a signal.')
      .default([]),
  }),
});

/* --------------------------------------------------------------- experience */

const experience = defineCollection({
  loader: glob({ base: './src/content/experience', pattern: '**/[^_]*.md' }),
  schema: z.object({
    company: text('company', 'The employer name.'),
    role: text('role', 'Your job title there.'),
    location: z.string().optional(),
    start: yearMonth,
    /** Omit `end` (or set `current: true`) for your current role. */
    end: yearMonth.optional(),
    current: z.boolean().default(false),
    /** Lower numbers appear first. The newest role should have the lowest order. */
    order: z.number({ required_error: 'Missing required field "order" (a number: 1, 2, 3…).' }).int(),
    summary: text('summary', 'One sentence framing the role.'),
    highlights: z
      .array(z.string().min(1))
      .min(1, 'Add at least one bullet under "highlights:".'),
    technologies,
    /** Optional employer site. */
    href: link.optional(),
  }),
});

/* ----------------------------------------------------------------- projects */

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/[^_]*.md' }),
  schema: z.object({
    title: text('title', 'The project name.'),
    /** Shown beside the title. Five words or fewer works best. */
    tagline: text('tagline', 'A very short subtitle.'),
    description: z
      .string({ required_error: 'Missing required field "description" — the project card summary.' })
      .min(30, 'Field "description" needs ~30+ characters.'),
    /** `true` promotes the project to a full-width cinematic case study. */
    featured: z.boolean().default(false),
    /** Lower numbers appear first. */
    order: z.number({ required_error: 'Missing required field "order" (a number: 1, 2, 3…).' }).int(),
    year: yearMonth,
    status: z.enum(['active', 'shipped', 'archived']).default('shipped'),
    /** Colour treatment for the case study. */
    theme: z.enum(['ember', 'ion', 'dust', 'void']).default('void'),
    technologies,
    /* Optional deep-dive fields. Any you omit are simply not rendered. */
    problem: z.string().optional(),
    approach: z.string().optional(),
    architecture: z.array(z.string().min(1)).default([]),
    decisions: z
      .array(z.object({ title: z.string().min(1), detail: z.string().min(1) }))
      .default([]),
    outcomes: z
      .array(z.object({ value: display, label: z.string().min(1) }))
      .default([]),
    links: z
      .object({
        github: link.optional(),
        demo: link.optional(),
        docs: link.optional(),
      })
      .default({}),
    /** Path under /public, e.g. "/images/projects/reqbridge.png". */
    image: z.string().optional(),
    imageAlt: z.string().optional(),
  }),
});

/* ---------------------------------------------------------------- education */

const education = defineCollection({
  loader: glob({ base: './src/content/education', pattern: '**/[^_]*.md' }),
  schema: z.object({
    institution: text('institution', 'The school name.'),
    credential: text('credential', 'e.g. "Master of Science".'),
    field: z.string().optional(),
    start: yearMonth,
    end: yearMonth,
    location: z.string().optional(),
    distinction: z.string().optional(),
    order: z.number().int(),
  }),
});

/* ------------------------------------------------------------------- skills */

const skills = defineCollection({
  loader: glob({ base: './src/content/skills', pattern: '**/[^_]*.md' }),
  schema: z.object({
    /** Group name, e.g. "Languages". Becomes one constellation. */
    label: text('label', 'The group name, e.g. "Languages".'),
    /** Lower numbers appear first. */
    order: z.number().int(),
    /** One short line describing the group. */
    note: z.string().optional(),
    items: z
      .array(
        z.union([
          z.string().min(1),
          z.object({
            name: z.string().min(1),
            /** Optional context, e.g. "Primary language at UPS". Never invent years. */
            note: z.string().optional(),
            /** `true` renders the item brighter in the constellation. */
            core: z.boolean().default(false),
          }),
        ]),
      )
      .min(1, 'Add at least one entry under "items:".'),
  }),
});

/* -------------------------------------------------------------- credentials */
/* Certifications, awards, publications and talks share one shape so new kinds
   never require a schema change. An empty folder hides the section entirely.  */

const credentials = defineCollection({
  loader: glob({ base: './src/content/credentials', pattern: '**/*.md' }),
  schema: z.object({
    title: text('title', 'The credential name.'),
    kind: z.enum(['certification', 'award', 'publication', 'talk']),
    issuer: text('issuer', 'Who issued or published it.'),
    date: yearMonth,
    href: link.optional(),
    detail: z.string().optional(),
    order: z.number().int().default(0),
    /** `true` keeps the entry out of the site. The shipped template uses it. */
    draft: z.boolean().default(false),
  }),
});

export const collections = { profile, experience, projects, education, skills, credentials };
