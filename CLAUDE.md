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

Environment variables (`.env.local`): `MONGODB_URI`, `NEXTAUTH_SECRET` (see `src/lib/db.ts` and `src/app/api/auth/[...nextauth]/route.ts`).

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

**Image uploads**: `POST /api/admin/upload-image` (`runtime = 'nodejs'`) validates mime type/size and writes files directly to `public/uploads/` with a randomized filename, returning `{ url: "/uploads/<file>" }` to be stored on the relevant document (e.g. `groupPhotoUrl`, `coverUrl`, `images`).

**UI components**: shadcn/ui ("new-york" style, see `components.json`) generates components into `src/components/ui/`; import via the `@/*` → `./src/*` path alias. Icons from `lucide-react`. Rich text (e.g. band bio) uses Tiptap and is stored/rendered as raw HTML (`dangerouslySetInnerHTML`).
