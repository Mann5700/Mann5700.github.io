import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { url } from '../lib/site';

export const GET: APIRoute = async () => {
  const profile = (await getEntry('profile', 'profile'))!.data;

  const manifest = {
    name: `${profile.name} — ${profile.role}`,
    short_name: profile.name,
    description: profile.summary,
    start_url: url('/'),
    scope: url('/'),
    display: 'standalone',
    background_color: '#05060a',
    theme_color: '#05060a',
    icons: [
      { src: url('/favicon.svg'), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: url('/icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: url('/icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  });
};
