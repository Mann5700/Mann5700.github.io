# Mann Patel — Portfolio

A static, content-driven personal portfolio. Everything visitors read lives in
Markdown files under `src/content/`. Nothing on the page depends on an API, a
database or a server at runtime.

**Live:** set by GitHub Pages after the first deploy (Settings → Pages).

---

## 1. What this is

| | |
| --- | --- |
| Type | Static site, pre-rendered to plain HTML at build time |
| Content | Markdown + YAML frontmatter, validated at build time |
| Runtime dependencies | None. No API calls, no third-party scripts, no trackers |
| Hosting | GitHub Pages, deployed automatically on `git push` |

The site is one long page (`/`) plus one detail page per project
(`/missions/<name>`), a 404 page, a sitemap, a robots file and a web manifest.

---

## 2. Tech stack, and why

| Choice | Reason |
| --- | --- |
| **Astro 5** | Ships zero JavaScript by default and pre-renders everything. A portfolio does not need a framework running in the browser. |
| **TypeScript** | Strict mode. Content types are generated from the schemas, so a typo in a field name is a build error. |
| **Content Collections + Zod** | Content is validated against a schema. A missing field fails the build with a message that names the file and the field. |
| **Plain CSS + design tokens** | Every colour, size, spacing step and easing curve is a custom property in `src/styles/tokens.css`. No utility framework to upgrade, no build-time class generation. |
| **Raw WebGL (no Three.js)** | The hero's gravitational lens is one hand-written fragment shader, about 6 KB of source. Three.js would have added ~600 KB for the same effect. |
| **CSS animation + IntersectionObserver** | Scroll reveals and transitions need roughly 40 lines of code. GSAP and Framer Motion were not worth their weight here. |
| **`@fontsource-variable`** | Fonts are installed from npm and self-hosted. No request to a font CDN, so nothing breaks if one goes down. |
| **GitHub Pages** | Free, static, Git-based, automatic HTTPS, automatic deploy on push, instant rollback by reverting a commit. |

**What deliberately is not here:** no backend, no database, no auth, no
serverless functions, no runtime GitHub API calls, no contact form that can
silently fail, no analytics.

---

## 3. Project structure

```
.
├── .github/workflows/deploy.yml   # build + deploy on push to main
├── public/                        # copied verbatim to the site root
│   ├── favicon.svg
│   ├── icons/                     # PNG app icons (generated)
│   ├── og/og.png                  # social preview image (generated)
│   ├── images/projects/           # project screenshots go here
│   └── resume/                    # your PDF lives here
├── scripts/
│   ├── generate-og.mjs            # renders the social image + icons
│   └── validate-content.mjs       # pre-flight checks before every build
├── src/
│   ├── components/                # one file per section of the page
│   ├── content/                   # ← THIS IS WHERE YOU EDIT THINGS
│   │   ├── profile/               # your name, headline, about copy
│   │   ├── experience/            # one file per job
│   │   ├── projects/              # one file per project
│   │   ├── education/             # one file per degree
│   │   ├── skills/                # one file per skill group
│   │   └── credentials/           # certifications, awards, talks, papers
│   ├── content.config.ts          # the schema every content file must match
│   ├── layouts/Base.astro         # <head>, nav, footer, SEO, structured data
│   ├── lib/site.ts                # small shared helpers
│   ├── pages/                     # routes
│   ├── scripts/                   # browser-side enhancement (cosmos, ui)
│   └── styles/                    # tokens.css + global.css
└── astro.config.mjs
```

---

## 4. Local development

```bash
npm install
npm run dev          # http://localhost:4321
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run validate` | Content pre-flight (missing files, broken asset paths) |
| `npm run check` | TypeScript + Astro diagnostics |
| `npm run verify` | validate → check → build. Run this before pushing |
| `npm run og` | Regenerate the social preview image and app icons |

---

## 5. Updating content

> Every file below is Markdown. Fields go between the two `---` lines
> (frontmatter); anything after the second `---` is body text.
>
> Every folder contains a `_template.md`. Files starting with `_` are ignored by
> the build, so templates can live next to real content. **Copy the template,
> rename it, fill it in.**

### 5.1 Update your profile (name, title, headline, about text)

Edit **`src/content/profile/profile.md`**. There is exactly one of these files.

```yaml
name: Mann Patel
role: Software Engineer
headline: One sentence about what you build.   # the big line in the hero
summary: >-
  Used as the meta description and social preview text.
location: Jersey City, NJ
email: you@example.com
availability: Open to interesting problems      # delete this line to hide the pill
resume:
  href: /resume/Mann-Patel-Resume.pdf
  updated: 2026-09
socials:
  - label: GitHub
    href: https://github.com/Mann5700
    handle: Mann5700
metrics:                                        # up to 4, shown under the hero
  - value: 4+ hrs
    label: PI Planning saved per dev team, per sprint
```

Everything below the frontmatter is the "About" copy. `**bold**` and `*italic*`
both work; italic renders as a subtle highlight.

### 5.2 Add a job

1. Copy `src/content/experience/_template.md`.
2. Rename it, e.g. `new-company.md`.
3. Fill it in:

```yaml
company: New Company
role: Senior Software Engineer
location: New York, NY
start: 2027-01        # YYYY-MM
current: true         # omit `end` when this is true
order: 0              # lower = higher on the page, so the newest job gets 0
summary: One sentence framing the role.
technologies: [Python, React]
highlights:
  - What you built, with the number that made it matter.
```

4. Open your previous job's file and set `current: false` and an `end:` date.
5. `git push`.

### 5.3 Add a project

1. Copy `src/content/projects/_template.md`.
2. **The file name becomes the URL**: `my-new-project.md` → `/missions/my-new-project`.
3. Required fields: `title`, `tagline`, `description`, `order`, `year`, `technologies`.
4. Optional but worth filling in: `problem`, `approach`, `architecture`,
   `decisions`, `outcomes`, `links`. Anything you omit is simply not rendered —
   no empty sections appear.
5. Set `featured: true` to promote it to a full-width cinematic case study on the
   home page. Two or three featured projects is the sweet spot.
6. Pick a `theme`: `ember` (warm), `ion` (cold), `dust` (neutral warm) or `void`
   (neutral cool). This tints the accent colour and the background glow.
7. Screenshots: drop the file in `public/images/projects/` and reference it as
   `image: /images/projects/my-new-project.png` with an `imageAlt`.

### 5.4 Remove a project

Delete its `.md` file. The card, the detail page, the sitemap entry and the
prev/next links all update on the next build. Nothing else to change.

### 5.5 Update skills

One file per group in `src/content/skills/`. `order` controls the sequence.
Items take either form:

```yaml
items:
  - Plain Technology Name
  - name: Python
    core: true                    # renders brighter, bigger star on the map
    note: Where you actually used it.
```

`note` values are listed under the group. Don't invent years of experience — the
notes read better as context than as claims.

### 5.6 Add a certification, award, paper or talk

Everything of that shape lives in `src/content/credentials/`. Copy
`example-credential.md`, fill it in, and **delete the `draft: true` line**. The
"Logbook" block appears automatically as soon as one non-draft entry exists, and
disappears again if you remove them all.

### 5.7 Replace the resume

> **Your phone number must never reach `public/`.** The resume you send to people
> has it in the header; the copy this site serves must not. A published PDF is
> downloaded, indexed and scraped — you cannot take it back.

1. Keep your full working copy at the repo root (`Mann Patel Resume.pdf`). It is
   gitignored, so it is never published.
2. Run `npm run resume`. It removes the phone number from the PDF's content
   stream — a real redaction, not a black box drawn over it — re-centres the
   contact line, keeps the original fonts and the email/GitHub/LinkedIn links,
   and writes the result to `public/resume/Mann-Patel-Resume.pdf`.
   The script exits non-zero if a phone number survives, so it cannot fail quietly.
3. If the filename changed, update `resume.href` in
   `src/content/profile/profile.md`.
4. Update `resume.updated` so the Signal section shows the right date.
5. `npm run validate` fails if `resume.href` and the file on disk disagree.

Requires Python with PyMuPDF (`pip install pymupdf`). It is a one-off tool, not
part of the build — the redacted PDF is committed, so deploys never need Python.

To check a PDF yourself:

```bash
python -c "import fitz; print(fitz.open('public/resume/Mann-Patel-Resume.pdf')[0].get_text(sort=True)[:200])"
```

### 5.8 Update social links

Edit the `socials:` list in `src/content/profile/profile.md`. The nav, the Signal
section, the footer and the `sameAs` structured data all read from that one list.

### 5.9 Change the look without touching components

`src/styles/tokens.css` holds every colour, type step, spacing step, radius,
shadow and easing curve. Changing `--c-ember` re-tints the entire site.

---

## 6. Deployment

### One-time setup

1. Push this repo to GitHub.
2. Repository → **Settings → Pages → Build and deployment → Source:
   GitHub Actions**.
3. Push to `main`.

That's it. The workflow in `.github/workflows/deploy.yml` validates content,
type-checks, builds and publishes. The site URL and base path are injected by
`actions/configure-pages`, so the same config works on a project page
(`user.github.io/repo`), a user page (`user.github.io`) and a custom domain.

### Custom domain (optional, later)

1. Settings → Pages → Custom domain → enter the domain.
2. Add the DNS records GitHub shows you.
3. Tick "Enforce HTTPS".

No code change is needed — the build reads the domain from the Pages config.

### Rollback

`git revert <commit>` and push. The previous version redeploys in about a minute.

---

## 7. How it degrades

The site is built so that failures are invisible rather than fatal.

| If this fails | What happens |
| --- | --- |
| JavaScript | Everything still renders. Reveal animations are skipped, navigation and all content work. |
| WebGL | The hero falls back to a CSS starfield and black hole composition. |
| GPU / low-end device | The shader drops a star layer and renders at 1× pixel ratio. |
| `prefers-reduced-motion` | Animations stop, the shader renders a single static frame, and the design still looks finished. |
| Slow connection | Fonts swap in; text is readable immediately. |
| A missing image | Nothing breaks — `npm run validate` catches the bad path before you push. |

---

## 8. Troubleshooting

**The build fails with "data does not match collection schema".**
The message names the collection, the file and the field. Open that file and fix
that field. Example:

```
projects → my-project data does not match collection schema.
  description: Missing required field "description" — the project card summary.
```

**`npm run validate` says a file doesn't exist.**
A content file references something in `public/` that isn't there. Either add the
file or fix the path.

**Dates.** Always `YYYY-MM` (e.g. `2026-09`) or `YYYY` (e.g. `2026`). Unquoted
years are fine.

**Two profile files.** There must be exactly one non-template file in
`src/content/profile/`. `validate` will tell you if there are more.

**`npm install` fails behind a corporate proxy.** Two separate problems can
appear:

- `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` — the proxy re-signs TLS. Point Node at
  your organisation's CA bundle instead of disabling verification:
  `$env:NODE_EXTRA_CA_CERTS = "C:\path\to\ca-bundle.pem"`.
- `401` / `CATEGORY_DENIED` — the proxy blocks `registry.npmjs.org`. Create a
  local `.npmrc` (it is gitignored) containing
  `registry=https://registry.yarnpkg.com/`, which is an official mirror of the
  same registry.

Neither workaround is needed in CI.

**The social preview is out of date.** Run `npm run og` and commit the result.
It is intentionally not part of the build, so the build has no image-rendering
dependency.

---

## 9. Conventions worth keeping

- **Content drives components.** No component contains a fact about Mann. If you
  find yourself editing a `.astro` file to change wording, the content model is
  missing a field.
- **Numbers must be real.** Every metric on this site traces back to the resume
  or a repository. Keep it that way.
- **New optional field?** Add it to `src/content.config.ts` as `.optional()` and
  guard the render with `{field && ...}`. Existing content keeps building.
