// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// `SITE` and `BASE_PATH` are injected by the GitHub Pages workflow so the same
// config works on a project page, a user page, and a custom domain.
const site = process.env.SITE ?? 'https://mann5700.github.io';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  output: 'static',
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  image: {
    responsiveStyles: true,
  },
});
