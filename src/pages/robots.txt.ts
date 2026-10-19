import type {APIRoute} from 'astro';import {catalog} from '../lib/catalog';
export const GET:APIRoute=({site})=>new Response(catalog.preview?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/\nDisallow: /quote-confirmation/\nDisallow: /*?\nSitemap: ${new URL('/sitemap.xml',site)}\n`,{headers:{'Content-Type':'text/plain'}});
