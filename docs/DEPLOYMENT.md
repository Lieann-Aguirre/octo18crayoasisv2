# Cloudflare deployment

## Fixing the reported D1 deployment error

Cloudflare error `10021: binding DB of type d1 must have a valid database_id` means `wrangler.jsonc` still has a placeholder or invalid D1 UUID. The Worker name and account ID are not database IDs. Telemetry is unrelated to this failure.

1. In Cloudflare, open **Storage & databases → D1 → octo18** and copy its **Database ID**. If it does not exist, create a D1 database named `octo18` first.
2. Replace only `REPLACE_WITH_D1_ID` in the `DB` binding with that UUID. Keep `binding: "DB"`. Keep the Worker name you selected (`octo18crayoasisv2`).
3. Set `vars.SITE_ORIGIN` to your actual HTTPS storefront origin, without a trailing slash. Confirm the private `octo18-media` R2 bucket exists.
4. Sign in locally with `npx wrangler login`, then apply the remote migrations and seed as described below.
5. Use `npm run deploy:api` to validate the configuration before deploying. In Workers Builds, use `npm run check:api-config` as the build command and `npm run deploy:api` as the deploy command. This Worker serves the API only.

For the **website**, create/connect a **Pages** project instead: build command `npm run build`, output directory `dist`, Node 24. Do not use a Workers deployment as the storefront. If Cloudflare says the project is disconnected from Git, reconnect the repository in the dashboard as a separate setup step. Upload the configuration changes to the connected repository before retrying a Git-triggered deployment.

`npm run check:api-config` validates required values locally; a dry run cannot prove that a remote D1 database or R2 bucket exists or that deployment credentials can access it.

## 1. Required launch decisions

Confirm the production domain, Renz’s login email, Facebook Page/Messenger URL, pickup instructions/hours, owner-approved prices and units, delivery wording, privacy/quotation wording, and any genuine reviews. The supplied Gmail address is the inquiry destination, not an assumed admin identity.

Before launch, edit/replace the flagged images and approve the content and pack details for every selected product. Historical stock is not a live inventory feed. Marketplace shipping fees never become delivery quotes.

## 2. API infrastructure

Use a Cloudflare account and a domain on Cloudflare DNS. Create resources (account actions may require your approval):

```sh
npx wrangler login
npx wrangler d1 create octo18
npx wrangler r2 bucket create octo18-media
```

Set the returned database ID in `wrangler.jsonc`; retain the `DB` and `MEDIA` binding names. Set `SITE_ORIGIN` to the exact HTTPS production origin, without a trailing slash.

```sh
npx wrangler d1 migrations apply octo18 --remote
npm run seed
npx wrangler d1 execute octo18 --remote --file=data/seed.sql
```

The initial seed uses `INSERT OR IGNORE`, so it cannot overwrite dashboard changes. Local development uses the same commands with `--local`. D1 credentials and inquiry data are never bundled into Pages.

Add Worker routes for `your-domain/api/*` and `your-domain/media/*`; all other traffic goes to Pages. Keep `workers_dev: false`. R2 must remain private; do not enable a public R2 bucket URL. API media uploads are private until their approved publication goes live.

Configure secrets through `wrangler secret put NAME` or the Cloudflare dashboard:

| Name | Purpose |
| --- | --- |
| `ACCESS_TEAM_DOMAIN` | `your-team.cloudflareaccess.com` |
| `ACCESS_AUD` | Access application audience |
| `ADMIN_EMAIL` | Verified Renz login email |
| `TURNSTILE_SECRET` | Server-side Turnstile verification |
| `MICROSOFT_CLIENT_SECRET` | Entra application secret (Worker secret only) |
| `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID` | Entra identifiers |
| `SMTP_USER` | Microsoft 365 sender mailbox |
| `NOTIFY_FROM` | Same mailbox as SMTP_USER |
| `NOTIFY_TO` | `felicianorenz029@gmail.com` initially |
| `CATALOG_BUILD_TOKEN` | Long random secret shared only with Pages builds |
| `PAGES_DEPLOY_HOOK` | Production-branch Pages deploy hook URL |
| `CF_ACCOUNT_ID` | Account containing Pages |
| `CF_PAGES_PROJECT` | Pages project name |
| `CF_API_TOKEN` | Account-scoped token with Pages Read for deployment monitoring |

Deploy the Worker with `npx wrangler deploy` after configuring routes and bindings. The scheduled handler retries unsent notifications and checks active publications every 15 minutes. A failed notification never discards a request.

## 3. Protect Renz’s dashboard

Create one self-hosted Cloudflare Access application covering `/admin/*` and `/api/admin/*`, allow only Renz’s verified email, and copy its audience into `ACCESS_AUD`. Both paths should use the same application/audience. The Worker checks the JWT signature, issuer, audience, expiry and email; a supplied identity header alone is insufficient.

Do not place `/api/quotes` behind Access. Build endpoints use the separate bearer build token. To keep the admin shell private on a Pages alias, protect the `pages.dev` hostname through Access or redirect that hostname to the production domain with a Cloudflare rule. No actual draft or inquiry data is stored in the static admin shell.

Check that a logged-out browser cannot access admin data; then sign in as Renz and verify product saving and quote management. Use a separate staging database/bucket/project to test auth changes or imports.

## 4. Pages configuration and publication

Connect this repository to a Cloudflare Pages Git project. Build: `npm run build`. Output: `dist`. Node: 24. The project’s production branch must match the deploy hook. Disable automatic production builds on push for the initial rollout so only intentional publications go live.

Pages production environment variables:

```text
SITE_URL=https://your-domain
CATALOG_API_URL=https://your-domain
CATALOG_BUILD_TOKEN=<same build secret as Worker>
REQUIRE_APPROVED_CATALOG=true
PUBLIC_TURNSTILE_SITE_KEY=<site key for your domain>
PUBLIC_GA_ID=<optional G-... ID>
```

`PUBLICATION_ID` is optional for an intentional pinned rebuild, not normally needed. Every build fetches one immutable approved snapshot. Only one publication may be pending/building at a time, enforced by a D1 unique index. The build registers its `CF_PAGES_URL` against that snapshot. The monitor matches that exact deployment, and checks the production `/publication.json` marker before declaring it live. Draft changes during a build do not change its snapshot.

Create a deploy hook for the production branch and set it in the Worker. Cloudflare deploy hooks do not accept arbitrary environment overrides; this implementation does not depend on them.

### First launch

The public build requires at least one approved publication; there is deliberately no fallback to drafts. To access the dashboard before the first public launch:

1. Build the local noindex preview and deploy `dist/` to the Pages project while keeping the entire production hostname behind a temporary owner-only Access application. Keep the admin application’s audience configured separately for its paths.
2. Configure Worker routes, D1 seed, Access, Turnstile and email.
3. Sign in to `/admin/`, complete settings, review content and images, and select products for publication.
4. Set Pages production build variables above. Publish from the dashboard and verify the production marker and status while the site is private. If the production marker is behind whole-site Access, temporarily permit the non-sensitive `/publication.json` path for monitoring or remove whole-site protection only after manually verifying the deployed approved snapshot. Keep admin protections.
5. Confirm all launch checks, then open the storefront to customers. Never expose the initial unapproved preview as the final catalog.

The build URL itself must be able to access the token-protected `/api/build/*` endpoints; do not put those behind the temporary whole-site Access rule. Use specific Access path exclusions for `/api/build/*` and the public marker while retaining their own API authentication.

If a build fails, the last successful Pages version stays live. Inspect its Cloudflare build log, correct the problem and refresh the publication status before publishing again. If failure happened before `sync-catalog.mjs` could register a deployment URL, match the hook-triggered deployment manually in Cloudflare, verify it is terminal, then mark the corresponding D1 publication failed through an authenticated operator command. Do not clear an active lock while its deployment can still go live.

## 5. Delivery, SEO and analytics validation

Verify all five inquiry actions using real business contact destinations. Facebook remains a stated pending link until supplied; publication requires it. Test a real quote request with your own test details, confirm inbox storage and email, and delete the test inquiry after verification. Check sender DNS, Turnstile hostname, API routing and notification retry.

Submit the sitemap to Search Console after approving the live domain. Verify product/category metadata and JSON-LD with Google’s validators. Product markup never invents stock or reviews; prices appear only after approval. Set up GA4/Search Console in your own accounts. GA4 events are `contact_click`, `quote_list_add`, and `quote_submit_success`; inquiry data is not attached to these events. Configure consent behavior appropriate to your analytics settings before enabling optional analytics.

Generate real-user performance measurements after launch; no Lighthouse score is claimed by the source build alone. Target 90+ on representative mobile pages and review image weight, fonts and script cost if needed. Open Graph uses a PNG cover. Verify the preview with Facebook’s sharing debugger after the domain is live.

## 6. Backup, recovery and retention

Before imports and regularly thereafter:

```sh
npx wrangler d1 export octo18 --remote --output=backup.sql
```

Store backups privately, outside Git and public directories. They contain customer data. Test restoration into a separate staging D1 database with `wrangler d1 execute ... --remote --file=backup.sql`, then compare product/inquiry counts and open representative records. Copy R2 objects using an S3-compatible backup client with scoped credentials; retain original image masters separately. Record restoration results before launch.

Use the Pages dashboard to roll back a bad deployment; confirm the restored `publication.json` marker. Also reconcile the live D1 publication pointer: the inquiry API uses the last successful publication record, so an operator must align publication status with the restored marker before reopening quote submission. A successful restore includes both the static deployment and its matching catalog snapshot.

Renz should periodically review closed inquiries and remove personal data no longer required, following the published privacy policy and applicable business recordkeeping requirements. The dashboard supports individual inquiry deletion. Exported CSVs and backups need the same care as the live inbox.

### Quote button unavailable

A missing `PUBLIC_TURNSTILE_SITE_KEY` disables online submission at build time. Create a Turnstile widget covering the actual storefront hostname, set its public site key in the **Pages build environment**, and configure the paired `TURNSTILE_SECRET` on the **API Worker**. Rebuild Pages after changing the public key. Also confirm `/api/quotes` routes to the API Worker and an approved catalog publication exists. SMTP credentials alone do not enable submissions. Do not use Turnstile test keys in production. The email alternative includes the list and estimate, but the customer must send it in their email app.

### Octo18 Access identifiers

The confirmed team domain is `octo18.cloudflareaccess.com`; the configured administrator email is `felicianorenz029@gmail.com`. Both are set in `wrangler.jsonc`. The earlier login screenshot displayed `bold-mud-17de.cloudflareaccess.com`; after changing a team domain, start a fresh Access login using the current domain. Keep the existing JWT signature and audience checks enabled.

`ACCESS_AUD` is not visible in the supplied screenshots. Copy the Application Audience (AUD) Tag from the Access application covering both admin paths and set it on the API Worker (a Worker secret can keep this dashboard-managed value outside Wrangler vars). It is separate from the team domain, Application ID and Microsoft client ID. No placeholder AUD is supplied, and an absent AUD keeps the admin API locked.
