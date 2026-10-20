# Homepage design and carousel

## Editorial configuration

`src/lib/homepage.ts` controls the three campaigns, representative category products and featured fallback. These are build-time selections; no database migration, new API, dashboard editor or price change is involved.

- School essentials → `/collections/school/`
- Office essentials → `/collections/office/`
- Paper & printing supplies → `/categories/paper-printing/`

Featured owner selections take precedence, capped at eight. When none are marked, the explicit fallback IDs provide a mix of writing, pencils, record books, adhesives, filing, office accessories and paper. Paper highlights prefer four products not already featured. Popular/new-arrival sections remain dependent on their existing owner flags; no sales rankings or promotional prices are inferred.

Homepage category highlights exclude empty categories. Category records, category pages, product content and gallery assignments remain unchanged. If a selected product disappears, the image selection falls back within its category. Failed campaign photographs receive a typography treatment; failed category photographs reveal the category-name treatment. Source photos are not cropped, retouched or stripped of their watermarks or embedded badges.

## Image review

The existing library was visually reviewed for the seven representatives:

| Category | Selected product ID | Reason |
| --- | --- | --- |
| Pens & Writing | 20273922063 | Clean Pilot Hi-Tecpoint photograph with minimal surrounding decoration. |
| Pencils | 51867065643 | Recognisable Mongol pencil packaging and product grouping. |
| Notebooks & Record Books | 51867065641 | Strong blue record-book cover, readable identity. |
| Paper & Printing | 44817085596 | Existing owner-supplied PaperOne carton cover. |
| Filing & Envelopes | 51967065633 | Clear envelope grouping and category silhouette. |
| Adhesives | 55017070500 | Recognisable Elmer’s glue-stick packaging. |
| Office Equipment & Accessories | 51867065609 | Whiteboard grouping represents the broader office category. |

Several supplied images contain decorative borders, watermarks or guarantee badges. They are preserved, not adopted as new website promises. Existing image-review advice remains intact.

## Typography and font provenance

The regular variable Inter font is served locally from `public/fonts/InterVariable.woff2`, with `font-display: swap`, weight range 100–900, system fallbacks and one preload. The previous Google Fonts stylesheet request was removed. Logo images are unchanged.

- Font source: https://rsms.me/inter/font-files/InterVariable.woff2
- License source: https://raw.githubusercontent.com/rsms/inter/v4.1/LICENSE.txt
- Retrieved: 20 October 2026
- Included license: `public/fonts/Inter-LICENSE.txt` (SIL Open Font License 1.1).

## Carousel behavior

The first campaign works without JavaScript. Inactive slides are hidden, invisible and inert; all slides share a grid cell so the tallest campaign reserves the banner height before initialization. Controls are hidden until JavaScript initializes, with their space reserved. Only first-slide photographs have live src/srcset attributes initially; later photographs receive those attributes when their slide is selected, so overlapping layout does not cause unnecessary initial image downloads.

Autoplay waits seven seconds between changes. Hover, focus, an inactive browser tab, an offscreen carousel or reduced-motion preference stops its timer. Keyboard entry and manual navigation pause autoplay until Play is selected. After keyboard Play, advancing remains suspended while focus is inside, and resumes when focus leaves if the other safety conditions permit it.

Previous/next, indicators and left/right arrow keys wrap between campaigns. Deliberate touch/pen horizontal swipes navigate without suppressing vertical scrolling. Only manual changes update the polite live announcement. Reduced-motion preference disables autoplay and the brief fade; users can still navigate manually.

## Verification

- Targeted tests cover autoplay blockers, seven-second delay, manual pause/wrapping, swipe thresholds, editorial precedence, product removal and paper de-duplication.
- Build verification checks one server-rendered visible slide, two inert inactive slides, stocked category counts, local WOFF2 validity and existing link/catalog checks.
- Local browser checks confirmed Inter styling, seven photographic categories, no illustration nodes, working arrows/indicators, mouse Pause, keyboard Play, silent automatic advancement, manual announcements, stable banner height and no desktop horizontal overflow. Featured-product quick-add increased the local quote count, and the new item persisted with the correct estimate after navigating to the quote page. No request was submitted. No console errors or broken loaded images were observed. Key contrast checks: body text 13.83:1, primary button 5.81:1, captions 5.93:1 and campaign service text 5.47:1. Inactive indicator dots were darkened to exceed 3:1 against white.
- Responsive CSS uses two/three/four category columns and a stacked mobile campaign. Mobile controls use two rows to preserve 44px targets without horizontal overflow.
- Browser screenshot capture timed out. Visual sign-off at 360px, tablet and desktop, real touch gestures and system reduced-motion testing remain required where tooling permits. Do not treat the CSS/state tests as screenshot-based validation.
- No public deployment, live catalog edits, inquiry submission or Cloudflare configuration changes were performed for this refresh.

Run `npm.cmd test`, `npm.cmd run check` and `npm.cmd run build` before release. Use the existing production catalog build workflow; do not deploy the local preview catalog as production.


## Slim navigation header

The header uses a single desktop row with the existing logo, centered navigation and 44px search/admin/quote controls. Navigation collapses to the existing mobile menu below 1001px. At 360px, the logo and four controls fit within the existing container; mobile/tablet visual sign-off remains pending because browser viewport/screenshot tooling is unavailable.

The search icon reveals a labelled GET form targeting `/products/`; focus moves to its input. Escape or the close button restores focus to the search toggle. Opening search closes the mobile menu and opening the menu closes search. Resizing to desktop closes the mobile menu. The query survives closing/reopening search on the same page.

The user-outline icon links to `/admin/` with the accessible label and tooltip **Admin login**. It does not create a customer account flow, new credentials, or an authentication bypass. Existing Cloudflare Access and API authorization remain unchanged.

Local browser checks confirmed the 92px desktop row, search focus/Escape behavior, an A4 submission reaching `/products/?q=a4` with 21 results, the admin destination and the persistent quote count. Existing tests verify anonymous protected API requests are rejected. Desktop DOM measurements showed no horizontal overflow. Screenshot capture continued to time out; no screenshot-based mobile/tablet or desktop sign-off is claimed. The carousel, announcement strip, content headings and catalog remain unchanged by the header update.
