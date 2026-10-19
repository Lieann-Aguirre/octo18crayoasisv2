# Renz’s operating guide

## Prepare and publish a product

1. Sign in at `/admin/` through Cloudflare Access.
2. Choose a product. Confirm its name, brand, category, description, selling unit and exact pack contents.
3. Check each option and price. Tick the price approval only if the PHP prices should be public. Otherwise visitors see “Request a price”.
4. Inspect every image. Read its recorded Canva recommendations, replace poor/mismatched images, and remove redundant images. An edited image is not approved until you inspect the result.
5. Record suitability, background, lighting, crop, resolution, branding and editing recommendations. Set acceptable images to Approved. Use one clearly identified cover.
6. Confirm content and pack approval. Select Featured, Popular Pick, New Arrival and the relevant collections only where appropriate. “Popular Pick” is your selection, not a fabricated sales ranking.
7. Save. Preview the draft. Select “Include in next approved publication”.
8. Open Publish & history, check any outstanding issues and publish. Wait for the matching deployment to report success before treating the public catalog as updated.

Saving never updates the public website by itself. Failed builds leave the last successful version in place. Changing a category URL or product slug changes its public URL; ask your developer to add a permanent redirect when changing an established URL.

## Image editing in Canva

Use the image-specific notes in each product’s review panel. Start from an original you own, ideally large enough for a 1600 × 1600 px master. Keep packaging and actual colours accurate. Do not enlarge low-resolution thumbnails to simulate detail, remove third-party watermarks, or use a photograph of the wrong model. Preserve transparent PVC and fine pencil/clip edges when removing backgrounds.

The included WebP files are compressed versions for a faster preview. They still contain the old graphics; the recommended Canva edits have not been applied. Nineteen references need replacement/reshooting, including the corkboard in the whiteboard listing and the Fine Tech photo in the My Gel listing.

## Business settings

Update contact information, delivery/pickup text, hours, categories, FAQs, reviews and the default SEO description. Category, FAQ and review entries use structured JSON fields in this initial dashboard; preserve the displayed field names and syntax. Only reviews with confirmed permission can appear. Save and publish to update the site.

Never promise fixed delivery fees, nationwide coverage, stock availability, custom-production capability or response times unless you can support them. Bulk minimums and custom feasibility are confirmed case by case.

## Import another export

Select all four matching basic/media/sales/shipping workbooks in Import products. Review the additions and updates before confirming. Existing editorial text and image reviews remain; source prices/variants refresh and content/pack/price approvals reset. Check new options and model changes carefully. The import does not delete products absent from an export. Save products individually to add or remove options or retire a product by changing its publication selection to Draft, then publish.

## Handle quotations

New requests appear in Quote inbox. Check the item, variant, quantity and selling unit, then contact the buyer to clarify requirements. Move the status through New → In Progress → Quoted → Closed. Internal notes stay private. Quotations are sent manually; no website payment or order confirmation is generated.

If notification says failed, the request is still saved. Use Retry notification after email configuration is corrected. CSV export is available for your records; keep it private. Delete inquiries when appropriate under your retention process, after checking any recordkeeping obligations.

## Weekly checks

Review pending inquiries and failed notifications, confirm contact links, inspect important catalog changes, and back up before imports. Use Search Console and analytics to see which searches and products lead to qualified inquiries. Build school-season and office-restock campaigns around available products and real customer needs.
