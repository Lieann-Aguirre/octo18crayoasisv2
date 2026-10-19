# Renz’s operating guide

## Save and publish a product

1. Sign in at `/admin/` through Cloudflare Access and choose a product.
2. Edit its details, category, selling unit, variants and prices. Positive prices display publicly; zero means Price on request.
3. Add a cover image. Image review findings and Canva recommendations are advisory and remain available; there are no approval checkboxes.
4. Choose Visible or Hidden. Existing drafts remain hidden; new products default to Visible.
5. Select Save and publish. The edit is saved first and a catalog snapshot is queued automatically. Business settings and confirmed imports behave the same way.
6. Open Publish & history to see Saved, Queued, Building, Live or Failed. This panel refreshes every ten seconds. Edits made during a build are combined into the next build.

A failed build preserves saved edits and the last working public site. Correct its cause, then use Publish latest / Retry. Missing deploy-hook/token/monitoring configuration reports Saved—publishing needs configuration. Do not assume an edit is public until the matching publication is Live. Pages builds still take time. The existing cron also checks publication progress every 15 minutes when the dashboard is closed.

Product/variant IDs and URLs must remain valid and unique, visible products need a cover image and category references must exist. Changing an established URL may need a redirect. Review permission requirements for customer testimonials remain unchanged.

## Image editing in Canva

Use the image-specific notes in each product’s review panel. Start from an original you own, ideally large enough for a 1600 × 1600 px master. Keep packaging and actual colours accurate. Do not enlarge low-resolution thumbnails to simulate detail, remove third-party watermarks, or use a photograph of the wrong model. Preserve transparent PVC and fine pencil/clip edges when removing backgrounds.

The included WebP files are compressed versions for a faster preview. They still contain the old graphics; the recommended Canva edits have not been applied. Nineteen references need replacement/reshooting, including the corkboard in the whiteboard listing and the Fine Tech photo in the My Gel listing.

## Business settings

Update contact information, delivery/pickup text, hours, categories, FAQs, reviews and the default SEO description. Category, FAQ and review entries use structured JSON fields in this initial dashboard; preserve the displayed field names and syntax. Only reviews with confirmed permission can appear. Save and publish to update the site.

Never promise fixed delivery fees, nationwide coverage, stock availability, custom-production capability or response times unless you can support them. Bulk minimums and custom feasibility are confirmed case by case.

## Import another export

Select all four matching basic/media/sales/shipping workbooks in Import products. Review the additions and updates before confirming. Existing editorial text, categories, image recommendations and visibility remain; source prices/variants refresh. New imported products become visible. Confirming the import queues publication automatically. Check new options and model changes carefully. The import does not delete products absent from an export. Save products individually to add or remove options or hide a product by changing Visibility to Hidden and selecting Save and publish.

## Handle quotations

New requests appear in Quote inbox. Check the item, variant, quantity and selling unit, then contact the buyer to clarify requirements. Move the status through New → In Progress → Quoted → Closed. Internal notes stay private. Quotations are sent manually; no website payment or order confirmation is generated.

If notification says failed, the request is still saved. Use Retry notification after email configuration is corrected. CSV export is available for your records; keep it private. Delete inquiries when appropriate under your retention process, after checking any recordkeeping obligations.

## October 2026 catalog refresh

The local catalog has revised descriptions and prices calculated from the original sales export at 77%, rounded to the nearest centavo. `reports/price-reconciliation.json` records all 190 source and selling prices. `node scripts/update-catalog-oct2026.mjs` accepts the sales workbook path and replacement JPG path as arguments; it always uses the workbook prices, so rerunning does not compound the discount. The owner has enabled display of the revised selling prices. The refresh sets price approval only; publication, content, pack and image approval states remain unchanged.

The PaperOne Digital 80 GSM cover uses the supplied Canva design. Its review remains Needs Editing because the satisfaction-guarantee badge is unverified and the artwork shows the A4 variant. Other product images and its gallery remain unchanged.

The inquiry address is now **felicianorenz029@gmail.com**. Before publishing, update the deployed Worker’s `NOTIFY_TO` and the dashboard’s saved contact email to this address if they still use the previous address. Local file changes do not update existing D1 settings or immutable published snapshots. Review and save the revised catalog through the normal dashboard workflow, then publish an approved snapshot. The initial seed uses INSERT OR IGNORE and will not overwrite existing database records. Keep the admin login identity unchanged unless an administrator explicitly requests a login change.

## Researched descriptions and estimated quotations

The 20 October 2026 description refresh is documented in `data/product-research.json`, with a readable review in `reports/product-research.html`. Each of the 54 listings has an individual search query. A manufacturer family reference does not verify every regional pack; unresolved model, size and selling-unit differences remain listed for review. Exact-model manufacturer documentation was not found for every item. No substitute-model technical claims are used in those cases. The original basic-export descriptions and previous website copy are preserved in `data/content-archive/descriptions-before-research.json`; none of these research/archive files belong in public assets.

`node scripts/enhance-descriptions.mjs` rebuilds the enhanced copy from the preserved foundation. Review this script and research records before rerunning after editorial dashboard changes. The earlier price-refresh script skips descriptions with research records, so a price refresh cannot restore the shorter copy. Approval states, source prices, variants, images and categories are unchanged.

The quote page resolves existing saved lists against the current storefront catalog and calculates integer-centavo estimates for each selected variant. Unknown prices remain “Price on request” and are excluded from the priced-items subtotal. Delivery and separately quoted services are excluded. Removed options must be removed or replaced before submission. Successful requests store an authoritative estimate and publication ID in the existing inquiry JSON. Older inquiries display “Estimate not recorded.”

Deploy the updated Worker API and storefront together when approved. `POST /api/quotes` accepts `reviewedEstimate` with currency `PHP`, publication ID, item quantities, centavo unit prices/subtotals and grand total. The server recomputes prices against the successful live publication. A missing or changed reviewed estimate returns `409 PRICE_CHANGED` with the current estimate, requiring another customer review; accepted retries return the original saved reference and estimate even if catalog prices have since changed.

Online submission still requires `PUBLIC_TURNSTILE_SITE_KEY` in the Pages build, matching `TURNSTILE_SECRET` in the Worker, a live approved catalog publication and the configured `/api/*` route. Configure Microsoft 365 application credentials (see MICROSOFT365-SMTP.md), `SMTP_USER`, matching `NOTIFY_FROM` and `NOTIFY_TO=felicianorenz029@gmail.com` for notifications. The current local build has no Turnstile site key, so its submit button remains disabled; this is intentional. Notification failures preserve the request for retry. No Cloudflare configuration, database or public deployment was changed by this local update.

## Weekly checks

Review pending inquiries and failed notifications, confirm contact links, inspect important catalog changes, and back up before imports. Use Search Console and analytics to see which searches and products lead to qualified inquiries. Build school-season and office-restock campaigns around available products and real customer needs.

## Owner approval and paper category update

All 54 local products (190 variants, 153 images) carry owner approval. Twenty paper products are assigned to Paper & Printing Supplies; Paperclips remains in Office Equipment & Accessories. Existing selling units, descriptions, prices and image-editing recommendations are retained. Owner approval does not replace the remaining quotation confirmation of pack contents.

To apply only these approvals and category corrections to existing production records, run from the project root:

```powershell
npx wrangler d1 execute octo18 --remote --file=data/approve-catalog.sql
```

This changes live D1 product records; it does not publish a catalog or send email. It updates only the 54 known source IDs and does not insert missing records. Repeating it does not duplicate products. Do not rerun the seed to apply approvals: its INSERT OR IGNORE statements preserve existing rows.

Afterward open Products & images and confirm the records, then Publish & history → Publish approved catalog. The Pages build and publication status must succeed before quote submissions can use that catalog. If publication fails, resolve the displayed deployment configuration error; do not manually mark the publication successful. No remote changes were performed while preparing this update.
