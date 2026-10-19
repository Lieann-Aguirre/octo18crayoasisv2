# Octo18 Crayoasis Stationery

Astro static storefront for Cloudflare Pages, with a separate Worker API, D1, R2 and a single-user Cloudflare Access dashboard. No checkout or payment processing.

## Run locally

Use Node 24 and `npm ci`, then:

```sh
node scripts/sync-catalog.mjs
npm run dev
```

Open `http://127.0.0.1:4321/`. The included catalog preview contains 54 draft products, 190 variants and 153 visually assessed image references. Unapproved prices are hidden and indexing is disabled. The dashboard at `/admin/` requires the protected API; it never bypasses authentication locally.

```sh
npm run check
npm test
npm run build
```

The static output is `dist/`. `npm run build` also checks internal links/assets, metadata, JSON-LD, hidden prices and preview indexing. `wrangler deploy --dry-run` bundles the API without deploying it.

## Catalog and image audit

- `data/products.json`: editable initial drafts, original source IDs, variants, editorial titles and image assessments.
- `data/import-report.json`: joins, source filenames and specific data conflicts.
- `reports/image-review.html`: readable, image-by-image report with expandable product sections.
- `data/image-audit.json`: per-image visual observations, original URLs, dimensions and detailed Canva recommendations.
- `assets/product-images/`: responsive WebP derivatives, without upscaling. These preserve the existing images; they do not perform the recommended Canva edits.
- The original Excel files are untouched and are not included in the public output.

153 image references represent 152 unique URLs. Of those references, 19 need replacement/reshooting and 134 need editing or clarification. None has been approved on the owner’s behalf. Two model/content mismatches and multiple misleading pack/brand compositions are explicitly flagged.

To regenerate an import from the supplied export format:

```sh
npm run import -- "C:/path/to/exports"
```

This intentionally replaces local initial drafts. Do not rerun it over edited local data without a backup. In normal operation, use the dashboard’s four-file import preview, which preserves existing editorial text and resets affected publication approvals. Import does not delete products missing from an export. New images require visual review.

For a repeatable initial image audit, `scripts/download-images.py` downloads linked originals to ignored `tmp/image-review/`, and `scripts/record-image-review.py` records the observations made for this particular supplied export. The latter is specific to the original source order; never apply it to a different catalog. `scripts/prepare-images.mjs` generates WebP derivatives. Python needs Pillow; the website itself does not need Python.

## Deployment and operation

The supplied compact and full logos are retained in `assets/brand/` as untouched originals. Run `node scripts/prepare-brand.mjs` to regenerate their navy/blue versions, restrained yellow emblem details, transparent crops, favicon and social-sharing image. The compact mark appears in the header; the full mark appears in the footer and About page. The storefront retains its original blue, white and yellow theme and Cloudflare Pages deployment with the existing Worker API.

Follow [the deployment guide](docs/DEPLOYMENT.md) for Cloudflare, Access, email, Turnstile, backups and the immutable publication pipeline. Follow [Renz’s guide](docs/OPERATIONS.md) for daily catalog and inquiry management.

No live resources have been created. Required production identifiers and secrets are deliberately absent. Do not upload the entire repository as a static website; deploy only `dist/`.
