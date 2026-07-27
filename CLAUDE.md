# CLAUDE.md

Guidance for working in this repo. Keep it current as the project evolves.

## Project

**Lovebug Collective** — a marketing + custom-order website for a friend's handmade crochet
business. Angular 20 single-page app (standalone components, signals, `inject()`). The business
owner manages product/order content from a **Google Sheet**; the site reads it through a
**Google Apps Script web app** and the same endpoint receives customer order submissions.

## Where things live

The real project root is **`lovebug/`** (git root, `package.json`, `angular.json`), nested one
level under the workspace folder. **Run all `npm`/`ng` commands from `lovebug/`.**

```
lovebug/
  src/app/
    app.routes.ts            # route table
    app.config.ts            # providers (router, http client)
    features/                # one folder per page/feature
      home/  about-me/  portfolio/
      how-to-order/          # the order flow (most of the logic)
        services/            # how-to-order + order-submission services
        models/              # OrderCategory / OrderQuestion types
        data/                # legacy static seed data (see gotchas)
        category-card/ category-page/
    layout/                  # MainviewComponent (shell), header
  src/assets/data/order-categories.json   # build-time content fallback (generated)
  src/environments/environment.ts         # Apps Script API URL
  scripts/sync-lovebug-content.mjs         # fetches Sheet content at build time
  app-script.txt                          # reference copy of the LIVE Apps Script backend (see below)
  claude-app-script.txt                   # staging copy: not-yet-pasted-in Apps Script changes
  google-sheets.txt                       # local notes: what to set up in the Google Sheet (see Pricing)
```

`app-script.txt`, `claude-app-script.txt`, and `google-sheets.txt` are **gitignored** — they're
local reference/staging copies, not deployed code, and must never end up in the GitHub repo or a
Vercel build.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Dev server (`ng serve`) at http://localhost:4200 |
| `npm run build` | Production build to `dist/` |
| `npm run build:vercel` | Sync Sheet content **then** build (used by Vercel deploy) |
| `npm run sync:lovebug-content` | Fetch latest Sheet JSON into the fallback asset |
| `npm test` | Unit tests (Karma + Jasmine). No e2e framework configured. |

## Content pipeline (most important section)

Order categories (the products and their per-product order questions) come from a Google Sheet,
exposed via a Google Apps Script web app. There are **three layers**, in priority order at
runtime:

1. **Live API** — `environment.lovebugApiUrl` (a `https://script.google.com/macros/s/.../exec`
   URL). `GET` returns `{ success, version, lastUpdated, data: OrderCategory[] }`; `GET ?meta=1`
   returns just the version for cheap update checks; `POST` (used by order submission) accepts
   an order payload. This is the source of truth for the live site.
2. **Bundled fallback** — `src/assets/data/order-categories.json`. **Generated, do not
   hand-edit.** `scripts/sync-lovebug-content.mjs` fetches the Apps Script JSON and writes this
   file. It runs inside `build:vercel` and needs the **`LOVEBUG_CONTENT_URL`** env var (the same
   Apps Script `/exec` URL). Gives the app real content on first paint before the live fetch.
3. **Static seed** — `src/app/features/how-to-order/data/order-categories.data.ts`. **Appears
   to be unused legacy data** (entries are triplicated; not imported by the service). Treat as
   dead code, not a source of truth — confirm before relying on or editing it.

`HowToOrderService` (`features/how-to-order/services/how-to-order.service.ts`) loads in this
order: localStorage cache → bundled fallback JSON → live API, then version-checks via `?meta=1`
and refetches when the version changed. It caches data/version/lastUpdated in localStorage under
`lovebug_categories_*` keys.

`OrderSubmissionService` (same folder) POSTs an order — general info, per-question answers, and
base64-encoded reference images — to the same Apps Script URL as `text/plain` (avoids a CORS
preflight against Apps Script).

Note: the Apps Script `/exec` URL is a **public web-app endpoint, not a secret**; it lives in
committed source on purpose.

### The Apps Script backend (`lovebug/app-script.txt`)

This file is a **reference copy** of the actual Google Apps Script project (the source of truth
lives in the Apps Script editor bound to the Google Sheet, not in a deploy pipeline here) —
paste changes back into the Apps Script editor manually. When a change is drafted but not yet
pasted into the real editor, it's staged in `lovebug/claude-app-script.txt` instead; once the
user confirms it's live, that content should replace `app-script.txt` and the staging file goes
back to being empty/removed. It implements both sides of the API:

- **`doGet(e)`** — serves cached category/question JSON from Script Properties
  (`lovebug_categories_json` / `_content_version` / `_last_updated`), rebuilding the cache on a
  miss. `?meta=1` returns just `{ version, lastUpdated }` for `HowToOrderService`'s cheap
  version-check polling.
- **`doPost(e)`** — handles order submission end-to-end:
  1. Validates the payload (`validateOrderPayload_`) — required general fields, boolean flags,
     `agreementYes === true`, max 5 files, each file must be `image/*` with `name`/`mimeType`/
     `base64`.
  2. Generates a human-readable order ID: `LB-YYYYMMDD-###`, sequence reset daily
     (`generateOrderId_` scans the `Orders` sheet's column A for today's max sequence).
  3. Uploads reference images to Google Drive under folder ID
     `LOVEBUG_ORDERS_DRIVE_FOLDER_ID` (`1hX22VfM8JWZIWQOV903kSLFbyk5YIcVp`), one subfolder per
     order named `"<orderID> - <customer name>"` (`uploadOrderFiles_`).
  4. Recalculates the order's price server-side (`calculateOrderPrice_` — see "Pricing" below)
     and appends a row to the **`Orders`** sheet: order ID, timestamp, category slug/title,
     general fields, JSON-stringified answers, JSON-stringified uploaded-file metadata, status
     (`'New'`), an empty notes column, then `Total Price` and JSON-stringified `Price Breakdown`
     at the end of the row.
  5. Emails the customer an HTML+text order confirmation (`sendOrderConfirmationEmail_`) via
     `MailApp`, with question labels resolved from the `Questions` sheet. Email failures are
     caught and reported back in the response (`emailSent`/`emailError`) rather than failing the
     whole submission — the order row is already saved by that point.
- **Content cache rebuild** (`rebuildContentCache_`) reads the `Categories` and `Questions`
  sheets, filters to `active` rows, joins questions onto categories by `categorySlug`, sorts by
  `sortOrder` then label/title, and writes the resulting JSON + an MD5-based version hash + an
  ISO timestamp into Script Properties. This is what both `doGet` and the build-time sync script
  (`scripts/sync-lovebug-content.mjs`) ultimately read.
- **Auto-deploy on Sheet edit**: an installable `onEdit` trigger (`onEditInstallable`, must be
  wired up manually in the Apps Script triggers UI — it's *not* the simple `onEdit(e)`) calls
  `rebuildCacheAndTriggerDeploy_`, which rebuilds the content cache and then POSTs to a Vercel
  **deploy hook** URL (Script Property `VERCEL_DEPLOY_HOOK_URL`) — but only if 2+ minutes have
  passed since the last trigger (`lovebug_last_deploy_at` in Script Properties), to avoid
  spamming deploys while the sheet is being edited. So **editing the Google Sheet triggers a
  live Vercel redeploy automatically** (subject to that cooldown), independent of the periodic
  `?meta=1` version-check the client does.
- Manual entry points for the Apps Script editor: `initializeLovebugCache` (rebuild cache only),
  `refreshLovebugContent` (same), `refreshLovebugAndDeploy` (rebuild + deploy), and
  `authorizeLovebugServices` (no-op-ish call that touches Drive/Sheets/Mail once, used purely to
  trigger the Google OAuth consent screen for all required scopes).

### Pricing

Order pricing is Sheet-editable and computed as **base fee + sum of priced selections**:

- **`Categories` sheet** — `basePrice` column (number, blank/invalid → `$0`). Flat fee for that
  product.
- **`Questions` sheet** — `select`-type questions' existing `optionsJson` array may carry a
  `price` per option (`{"label":"Striped","value":"striped","price":5}`, missing → `$0`).
  `text`/`textarea`/`number` never contribute pricing. Yes/No-style add-ons (e.g. "Large/Double
  Book") are modeled as a two-option `select` rather than a dedicated boolean question type.
- **`color-list` question type** — a repeatable "Color 1 / + Add Color" text-box list (the
  business owner explicitly rejected a HEX/swatch picker; yarn-color matching by name works
  better for her customers). Priced by *count*, not by selection: three dedicated `Questions`
  columns per category — `colorIncludedCount` (colors covered by the base price, blank → `1`),
  `colorPricePerExtra` (blank → `$0`), `colorMaxCount` (blank → `colorIncludedCount`, i.e. no
  upsell until configured). `optionsJson` is unused/blank on `color-list` rows. A hard cap of 20
  boxes (`COLOR_LIST_HARD_CAP`, duplicated as a literal in both the Angular model and the Apps
  Script since they can't share code) applies regardless of `colorMaxCount`, enforced both in the
  UI and again server-side. See `google-sheets.txt` for the exact Sheet setup steps. The answer
  value for this question type is `string[]` (every other question type is a scalar) — this
  ripples through `OrderQuestion`, `LovebugOrderAnswers`, the reactive form (`FormArray` instead
  of `FormControl` for this one key, built in `CategoryPageComponent`'s constructor `effect()`),
  and the Apps Script's `sanitizeAnswers_`/`calculateOrderPrice_`/email formatting.
- **Server is the sole source of truth.** `calculateOrderPrice_(category, answers)` in the Apps
  Script (`doPost`) looks up the category fresh from its own Script-Properties cache
  (`getCategoryFromCache_`) and re-derives the total from the submitted answer *values* — the
  client payload has no price field to trust or distrust in the first place, so DOM/DevTools
  tampering with the on-screen number has zero effect on what's actually recorded. The
  recalculated `{ total, items }` is written to the new `Orders` columns, included in the
  confirmation email's "Price Summary" section, and returned in the `doPost` JSON response. For
  `color-list`, billable count is clamped to `colorMaxCount` server-side independent of the
  20-box hard cap, so a tampered client can't inflate the price by submitting more colors than
  the category allows.
- **Frontend** (`OrderPricingService`, `features/how-to-order/services/order-pricing.service.ts`)
  mirrors the same algorithm (base fee + priced `select` options + counted `color-list` extras)
  in TypeScript, purely for a live, **display-only** itemized estimate as the customer fills out
  `CategoryPageComponent`'s form (and again in the confirm modal) — never treated as
  authoritative. Formulas must stay in exact sync with `calculateOrderPrice_` — when changing
  one, change the other the same way.
- **Deployment status**: the base-fee + priced-`select` mechanism is live. The `color-list`
  additions are currently staged in `claude-app-script.txt` only — confirm with the user whether
  it's been pasted into the live Apps Script editor yet before assuming it's deployed; if not,
  `app-script.txt` won't have `color-list` support and the Sheet won't have the three new columns
  until both `google-sheets.txt`'s steps and the script paste happen.
- Not yet built: deposit-percentage display (explicitly deferred).

## Routing

Defined in `src/app/app.routes.ts`, all nested under `MainviewComponent` (the layout shell):
`''` (home), `how-to-order`, `how-to-order/:slug` (per-category order form), `portfolio`,
`about`.

## Conventions & gotchas

- **Edit `.scss`, never the committed `.css`/`.css.map`.** Every component has a compiled
  `*.component.css` + `*.component.css.map` checked in next to its `*.component.scss`. The
  `.scss` is the source; the `.css`/map are build artifacts. (`.claudeignore` hides them.)
- **Don't hand-edit `src/assets/data/order-categories.json`** — it's regenerated by the sync
  script. To change live content, edit the Google Sheet.
- **`CategoryPageComponent`'s `answers` FormGroup mixes `FormControl`s and one `FormArray`**
  (for `color-list` questions) — any code that walks `answersGroup.controls` generically (like
  `clearForm()`) must check `instanceof FormArray` and reset it structurally (remove extra
  controls, reset the first to `''`), not call `.setValue('')` on it directly.
- Components are **standalone** (no NgModules); use `inject()` and signals, register providers in
  `app.config.ts`.
- Styles use **SCSS**; component style budgets are tuned generously in `angular.json` (several
  past commits bumped the `anyComponentStyle` budget).
- Deploy target is **Vercel** via `build:vercel`; set `LOVEBUG_CONTENT_URL` in the Vercel env.
