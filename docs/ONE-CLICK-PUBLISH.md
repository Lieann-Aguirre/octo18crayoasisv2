# One-click save and publish fix - 7 November 2026

## Confirmed live issue

The public `/api/health` response was read on 7 November 2026 and reported `apiVersion: 2`, release `2026-10-20-publish-on-save-r2`. The repository already contained a newer dashboard and Worker release. An unchanged API version number allowed this older Worker through the dashboard's initial check, with missing endpoints producing the later error shown in the screenshot. Deploying Pages does not deploy this separate API Worker.

## Corrected behavior

- The dashboard now checks explicit publishing capabilities and the publication-status endpoint before allowing edits. The health response exposes only non-secret version/capability metadata.
- Product saves, settings saves and confirmed imports retain the edit and automatically resume publication even if an earlier build failed. There is no normal second Publish action.
- An older failed build cannot strand a newer saved revision. A failed latest build stays paused until another explicit save or a maintenance retry, avoiding an endless failed-build loop.
- The editor displays saved, queued, building and verified-live progress without rebuilding the form or discarding new unsaved input. A post-save monitoring/network error remains clearly distinct from a failed save.
- Publication monitoring runs every minute even with the dashboard closed. Existing notification retries remain on their fifteen-minute cadence.
- Existing immutable snapshot, fingerprint and production-marker checks remain required. A build is never manually marked successful, and quotation prices still use the last verified successful publication.
- Cloudflare Pages still needs build/deploy time. One click starts and tracks that work automatically; saving is not represented as instant deployment.

## One-time production release

This is an infrastructure release, not a step required for each future product update. It requires authorization for live changes; no production mutation is performed by this document.

1. Run `npm.cmd run check`, `npm.cmd test`, and `npm.cmd run build` from the project directory.
2. Run `pwsh -NoProfile -File scripts/release-cloudflare.ps1 -Apply`. This applies existing D1 migrations, deploys the Worker preserving dashboard variables/secrets, and verifies the **exact** local release plus publishing capabilities. The script without `-Apply` is preview-only.
3. Release only the publishing-fix source changes to the Pages-connected `main` branch. Exclude the PDF output and its generator unless separately requested. The matching dashboard release is necessary once; no new migrations are introduced by this fix.
4. Confirm `/api/health` reports `2026-11-07-one-click-publish-r4` and the publishing capabilities. Open the dashboard and verify its initial capability/migration check succeeds.
5. Observe an already authorized real edit progress from Saved to Live without opening Publish & history. For a new live test edit, agree its content with the owner first; do not invent, publish or remove test products silently.
6. Compare the saved product and successful snapshot with the live product page and publication marker. Do not claim the live issue resolved until the new release and content have been verified.

## Local checks

Targeted tests cover resuming after failure on save, newer edits surviving an older failed build, stopping repeated failures, preserving notification retry cadence, and truthful editor progress. Existing tests continue to cover concurrency, immutable prices, publication markers, missing configuration, imports, authorization, Turnstile, quotations and notifications.

Browser inspection could not attach to the currently open dashboard because of a browser-tool connection error. The public release was verified through a read-only request. No live product mutation or deployment was performed during diagnosis.

## Authorized release — 7 November 2026

The owner authorized the production release. D1 reported no pending migrations. Worker version eb914202-bcea-4881-a1e3-dbf6b8631f43 was deployed and the release script verified the exact r4 health response. The initial Cloudflare 7403 authorization error cleared on retry after checking the authenticated account. No live product content was changed for testing.


## Follow-up: saved price not reaching storefront

On 7 November, D1 contained both Multprint variants at PHP 65, saved revision 13, while publication monitoring was stuck on revision 4 and the verified revision was 3. Instrumenting the previously swallowed monitoring error revealed HTTP 400 / Cloudflare code 8000024. The deployment-list request used per_page=100. Changing it to 25 immediately cleared the error; the normal monitor verified revision 4 and queued revision 13 automatically. No publication was manually marked successful and no product values were changed for diagnosis.

Monitoring failures now appear as safe HTTP/code diagnostics rather than indefinite build messages. Provider text and credentials are excluded. The admin validator is labelled “Validate product details”; a separate “View product on shop” anchor opens the existing stable product URL in a new tab. Unsaved drafts remain available through Preview draft.

Regression coverage includes rejected monitoring credentials, sanitized error persistence/recovery and the deployment page-size contract. All 55 tests, Astro/Worker checks and static export passed.
