# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Instinct" is a Next.js (App Router) site for a band: a public homepage that reads content from MongoDB, and a `/admin` back-office (protected by NextAuth) where the band manages that content (concerts, releases, merch, gallery, general info, users). UI text/copy is in French.

## Commands

```bash
npm run dev      # start dev server (http://localhost:3000)
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint (flat config, eslint-config-next)
```

There is no test suite configured in this repo.

Environment variables (`.env.local`, full list with comments in `.env.example`): `MONGODB_URI`, `NEXTAUTH_SECRET` (see `src/lib/db.ts` and `src/app/api/auth/[...nextauth]/route.ts`).

## Architecture

**Data flow**: Mongoose models in `src/models/` (`Concert`, `Release`, `Merch`, `GalleryItem`, `GroupInfo`, `User`) are the single source of truth, connected to MongoDB via the cached-connection helper `dbConnect` in `src/lib/db.ts` (must be awaited before any model query, and is safe to call repeatedly thanks to the `global` connection cache). The public homepage (`src/app/page.tsx`) is a server component that queries all models directly and renders read-only content — it does not go through the API routes.

**Admin CRUD pattern**: each resource has a matching pair that follows the same shape — reuse it exactly when adding a new resource:
- `src/app/api/admin/<resource>/route.ts` — `GET` (list) and `POST` (create)
- `src/app/api/admin/<resource>/[id]/route.ts` — `PUT` (update) and `DELETE`
- Every handler starts with a session check via `getServerSession(authOptions)` (401 if absent) and calls `dbConnect()` before touching a model.
- Handlers normalize/trim the request body into a plain payload object and serialize Mongoose documents into plain JSON (stringified `_id` → `id`, dates → ISO strings) before returning — never return raw Mongoose documents.
- `src/app/admin/<resource>/page.tsx` is a `'use client'` page that owns all state (list, loading/saving/deleting flags, form state, modal open state) with plain `useState`/`fetch` — there's no shared data-fetching library (no SWR/React Query). It renders `DataTable` (TanStack Table wrapper, `src/components/admin/data-table.tsx`) for the list and `AdminModal` (`src/components/admin/admin-modal.tsx`) for the create/edit and delete-confirm dialogs.

When adding a new admin resource, copy the concerts implementation (`src/app/api/admin/concerts/`, `src/app/admin/concerts/page.tsx`, `src/models/Concert.ts`) as the template.

**Auth**: NextAuth with a single Credentials provider (`src/app/api/auth/[...nextauth]/route.ts`), passwords hashed with bcryptjs, JWT session strategy. `session.user` carries a custom `role` (`admin` | `super-admin`) and `id`, added via the `jwt`/`session` callbacks and typed in `src/types/next-auth.d.ts`. `src/middleware.ts` gates the whole `/admin/:path*` tree via `next-auth/middleware`; unauthenticated users are redirected to `/login`. `AppSidebar` (`src/components/app-sidebar.tsx`) additionally hides the "Utilisateurs" nav item unless `role === 'super-admin'` — client-side only, so any authorization for super-admin-only actions must also be enforced server-side in the relevant API route.

**Login flow (2FA by email)**: the Credentials provider does **not** accept a password. Step 1 is `POST /api/auth/login/start` (password check + rate limiting + 6-digit code mailed, stored hashed in `LoginChallenge`); step 2 is `signIn('credentials', { challengeId, code })`, verified by `src/lib/auth-challenge.ts`. Password reset: `/mot-de-passe-oublie` → `/api/auth/forgot-password` (always answers 200, mail sent via `after()`), then `/reinitialiser-mot-de-passe?token=` → `/api/auth/reset-password`. Changing a password bumps `User.tokenVersion`, which invalidates existing JWTs at the next role refresh (a deleted user is invalidated the same way). "Trust this device 30 days": after a valid code the login page calls `POST /api/auth/login/trust-device` (needs a session), which stores a hashed token in `TrustedDevice` and sets an httpOnly cookie scoped to `/api/auth/login`; `login/start` still requires the password, then skips the mail for a matching device. Password changes delete the user's trusted devices. Rate limiting is Mongo-backed (`src/lib/rate-limit.ts`, `RateLimit` model, TTL index). Password rules/bcrypt cost live in `src/lib/auth-config.ts`.

**Mail**: `src/lib/mail/` (SMTP via nodemailer; branded HTML templates in `layout.ts`, senders in `index.ts`). Config by env only: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, plus `NEXTAUTH_URL` (used for links and the logo in mails). Local = Mailpit (`localhost:1025`, UI on 8025); prod = Brevo (`smtp-relay.brevo.com:587`, SMTP login + key, validated sender in `MAIL_FROM`).

**Online shop**: one shared stock with the admin till (`/admin/merch/caisse`). Public flow: `/merch/[slug]` → cart (`CartProvider`, localStorage, drawer in `SiteHeader`) → `/panier` → `/commande` (contact + relay point/home) → `/commande/recapitulatif` → Stripe Checkout → `/commande/confirmation`. The browser only sends `{merchId, size, quantity}`; `src/lib/shop.ts#resolveCart` re-reads prices/stock/weight from Mongo and `POST /api/shop/checkout` recomputes shipping and creates the `Order` (`pending_payment`) after reserving stock with `src/lib/stock.ts#reserveStock` (atomic conditional `$inc`, all-or-nothing). Only the Stripe webhook (`/api/stripe/webhook`, signature verified) marks an order paid. Every order status change goes through `src/lib/orders.ts#transitionOrder` (atomic, guarded by the previous status) and side effects (restock, refund, mails) run only when it returns non-null, so webhook replays are no-ops. Expired reservations are released by `checkout.session.expired`, by `releaseExpiredOrders()` (lazy) and by the `vercel.json` cron `/api/cron/release-stock`. Paid orders create an online `Sale` (`source: 'online'`, `paymentMethod: 'stripe'`) so stats include the online channel; shipping is excluded from revenue. Shipping prices come from an admin-edited weight grid (`ShopSettings`, `/admin/commandes/reglages`), NOT from Boxtal (API v3 has no quote endpoint). Boxtal (`src/lib/boxtal.ts`) is used for relay points, labels, tracking webhook — written from public docs and **not yet validated against the real sandbox**: run `npm run boxtal:check` once keys exist. Admin orders: `/admin/commandes` (+ `[id]`, `reglages`), API under `src/app/api/admin/orders/`. Mails: `src/lib/mail/orders.ts`. Legal pages (`/cgv`, `/mentions-legales`, `/confidentialite`) contain highlighted `[À COMPLÉTER]` placeholders. Env: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BOXTAL_*`, `SHIPPER_*`, `ORDER_NOTIFY_EMAIL`, `CRON_SECRET`. Local Stripe webhook: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

**File uploads (S3)**: files sent from the admin (group photo, logos, press kit, release covers, merch/gallery images) live in an S3-compatible bucket (OVH Object Storage, Gravelines); the browser uploads directly with a presigned PUT, the file never goes through the Next server. Flow: the pages call `uploadFile(file, folder)` (`src/lib/storage/upload-file.ts`) → `POST /api/admin/upload-image` (session + `admin`/`super-admin` role checked server-side, `rateLimit` per user, zod-validated `{ folder, contentType, size }`) → returns `{ uploadUrl, publicUrl, headers }` → the client PUTs with those exact headers and stores `publicUrl` on the document (`groupPhotoUrl`, `coverUrl`, `images`...).
- Business code only imports `src/lib/storage/` (`getStorage()` → `StorageProvider`); the AWS SDK lives only in the adapter `s3.ts`. `policy.ts` holds the fixed folder list (`group`, `logo`, `signature`, `press-kit`, `releases`, `merch`, `gallery`), allowed types per folder and the server-generated key `uploads/{folder}/{yyyy}/{mm}/{uuid}.{ext}` (client file names are never reused). `limits.ts` (shared with the browser, no Node imports): images 10 MB, PDF 20 MB, ZIP 200 MB; PDF/ZIP only for `press-kit`; no SVG.
- The signature covers `Content-Type`, `Content-Length`, `Cache-Control` and `x-amz-acl: public-read` (valid 5 min), so S3 rejects a file that differs from what the route validated.
- Images are **always re-encoded in the browser** (`resize-image.ts`: canvas → WebP q0.85, 2560 px max) to strip EXIF/GPS; PDF/ZIP are sent untouched.
- Env (see `.env.example`): `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_BASE_URL` (validated lazily by `getS3Config()`); `next.config.ts` derives `images.remotePatterns` from `S3_PUBLIC_BASE_URL`. On the VPS (PM2 + Caddy) env vars go in `.env.production`, not in the PM2 environment.
- Scripts: `node --env-file=.env.local scripts/s3-setup-cors.mjs` (bucket CORS, once); `scripts/migrate-blob-to-s3.mjs` (Vercel Blob → S3, dry-run by default, `--apply` to write, always back up Mongo first). `@vercel/blob` is still installed and `*.public.blob.vercel-storage.com` is still in `remotePatterns` until the migration is done.

**UI components**: shadcn/ui ("new-york" style, see `components.json`) generates components into `src/components/ui/`; import via the `@/*` → `./src/*` path alias. Icons from `lucide-react`. Rich text (e.g. band bio) uses Tiptap and is stored/rendered as raw HTML (`dangerouslySetInnerHTML`).
