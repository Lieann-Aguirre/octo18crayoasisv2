# Catalog consistency audit and release guide

## Evidence captured before implementation (20 October 2026)

- Product `57166101259` appeared as `Multiprint Fax Paper Rolls — 210 mm / 216 mm test` in the authenticated dashboard. The save therefore persisted; this is not evidence of a failed database update.
- Dashboard: saved revision 6, live revision 3, active publication `093cef3e-0955-4e8b-a91a-24026b319881` building. The successful history entry `f81786f6-dd80-4b70-b234-536957bce477` was older. Success on that history entry did not establish that revision 6 was live.
- A subsequent fresh public marker read returned `093cef3e-0955-4e8b-a91a-24026b319881`, while the public product heading still lacked `test`. The old marker carried no revision or fingerprint. This proves a saved/live difference, but cannot establish whether that immutable snapshot predates the edit or whether stale HTML was delivered.
- No production catalog changes, publication retries, database migrations, CDN purges or deployments were performed during this implementation.

## Findings register

| Area | Finding / verification | Local fix / release check |
| --- | --- | --- |
| Database | Dashboard retained the edited title. | Compare saved and live action reads saved record and active/live snapshots by product ID. |
| Draft / visibility | Edited product was visible, with no validation issues. | Retain visibility; legacy approvals do not gate publishing. |
| Build / deployment | Saved revision was newer than the live revision; older success was easy to misinterpret. | Show saved, building and verified live revisions separately; label older successes. |
| API synchronization | Production uses immutable snapshot selection, not a browser live query. | Build payload now includes revision and SHA-256 fingerprint. Monitor requires exact metadata on deployment and production markers. |
| Fixed publication variable | A fixed PUBLICATION_ID can pin an older snapshot. Production values could not be independently inspected in the blocked Cloudflare dashboard. | Production builds reject a pinned ID that differs from the currently selected snapshot. Remove the fixed variable for normal deploy-hook publishing. |
| HTML / browser / CDN cache | Not proven as the original cause; no production response-header inspection or cache purge was performed. | Directory HTML routes revalidate; hashed Astro assets retain immutable caching; publication.json remains no-store. Inspect any dashboard cache rules at release. |
| Frontend refresh | Product pages, listings, category pages and search are static build output. There is no separate remote search-index synchronization. | All derive from one imported build catalog. Export verification rejects stale embedded product names and mismatched publication metadata. |
| Overwriting / source selection | Local JSON is a deliberate preview fallback, not a production source. | Existing Pages production guard remains; production fails if catalog API configuration is missing. |
| Category / collection indexing | No external indexing service or asynchronous category queue exists in this project. | Rebuilt from the same product snapshot. Verify the edited title on product, category, collection and search pages after release. |
| Console / network | Local browser search, variant dialog, quick-add and quote persistence were exercised. Production console/network and deployment-host comparisons remain unverified. | Check browser console, API responses and deployment URL during the authorized release; do not infer a network cause from screenshots. |

## Separate reviewable changes

1. **Publication correctness:** shared metadata helper, Worker build/monitor/audit responses, sync/export scripts, publication metadata in Base, cache headers, admin status and tests. No D1 migration is required. Existing successful publications stay readable; new builds must emit the stronger marker before they can become newly verified live publications.
2. **Retail UI:** header/navigation, homepage, product cards, filters, gallery, site interactions and CSS. Prices, catalog data, categories, logos and quote submission remain unchanged. Revert these UI changes independently if necessary; retain the publication metadata tags in Base.

## Release sequence (operator-run; not executed here)

1. Run `npm.cmd test`, `npm.cmd run check`, `npm.cmd run build`. A local build correctly says **preview**; do not upload that local dist as the production catalog.
2. Deploy the updated Worker from this project: `npm.cmd run deploy:api`. Preserve existing secrets and bindings.
3. In Pages **Production** build variables, confirm CATALOG_API_URL, matching CATALOG_BUILD_TOKEN and PUBLIC_TURNSTILE_SITE_KEY. Remove a fixed PUBLICATION_ID for normal save-triggered builds. Do not change security protections or reveal secrets.
4. Release the updated source to the Pages production branch using the existing release workflow. Let any active legacy build finish or fail normally; do not manually mark success. Retry the latest saved catalog through the dashboard after the build code is available.
5. Confirm `publication.json` contains publicationId, revision and a 64-character fingerprint on both the deployment URL and production domain. A legacy marker without these fields cannot newly pass verification.
6. In the product editor, select **Compare saved and live**. The saved title and latest successful snapshot must contain the existing `test` edit. Confirm saved revision equals verified live revision, with no newer build queued.
7. Inspect product heading, description, listing, category, related-card and search results; compare the HTML `octo18-publication`, revision and fingerprint meta tags. SEO title is an independent editable field, so a custom SEO title need not contain the product-title edit.
8. Check DevTools response headers and console on both origins. Only if headers show a conflicting cache rule, correct that rule or purge the affected HTML. Do not use a blanket cache purge as a substitute for snapshot verification.
9. Verify quotation pricing still resolves against the last verified live snapshot. Do not send a further live test inquiry without authorization.

## UI checks and limitations

- Local browser verified explicit variant choice, disabled add until selection, quote-count update, focus restoration to trigger, A4 search and saved-list persistence.
- CSS defines 360px mobile, tablet and desktop layouts, 2/3/4 homepage category columns, mobile filter controls, visible focus and reduced-motion overrides.
- Browser screenshot capture timed out; mobile/tablet screenshot-based visual sign-off remains required. A temporary iframe review page was removed and is not shipped. Do not treat responsive CSS alone as completed visual QA.
- No new live product edits were created, and the diagnostic `test` edit was not removed.
