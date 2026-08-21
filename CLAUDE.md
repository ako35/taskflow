# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

TaskFlow is a task/workspace management app: Google-OAuth-authenticated users manage tasks inside "workspaces" (with roles OWNER/MEMBER), invite teammates by email, comment on tasks, and get reminder/comment notifications. It's a monorepo with:

- `frontend/` — Vite + React 18 + TypeScript SPA
- `backend/` — Express + TypeScript + Prisma (PostgreSQL) API
- `apps/mobile/` — Expo (React Native) app, currently untracked/in-progress
- `packages/shared/` — `@taskflow/shared`, cross-package TypeScript types (currently just re-exports `types.ts`)

npm workspaces are defined at the root `package.json` (`frontend`, `apps/*`, `packages/*`) — note `backend` is **not** a workspace member; it's installed/run standalone.

Deployment target is Vercel: `frontend` builds as a static site, `backend/api/index.ts` runs as a single Node serverless function, and `vercel.json` routes `/api/*` to it and everything else to the SPA. See `DEPLOY_VERCEL.md` for the full env var list and deploy steps.

## Commands

Run these from the respective package directory (`backend/` or `frontend/`), not the repo root — there is no root-level dev/build/test script.

### Backend (`backend/`)
```bash
npm install                    # also runs postinstall -> prisma generate
npm run dev                    # ts-node-dev on src/index.ts, http://localhost:4000
npm run typecheck              # tsc --noEmit -p tsconfig.json
npm run typecheck:vercel       # tsc --noEmit -p tsconfig.vercel.json (used at deploy time)
npm run db:migrate             # prisma migrate dev
npm run db:generate            # prisma generate
npm run db:deploy              # prisma migrate deploy (production)
```
There is no lint or test script for the backend.

### Frontend (`frontend/`)
```bash
npm install
npm run dev                    # vite dev server, http://localhost:5173, proxies /api -> :4000
npm run build                  # vite build
npm run test                   # vitest (watch)
npm run test:run               # vitest run (single pass, use this in CI/one-shot checks)
```
Run a single test file: `npx vitest run src/utils.test.ts`. There is no lint script.

### Mobile (`apps/mobile/`)
Standard Expo scripts (`npm start`, `npm run android/ios/web`). This app is early-stage and has its own `apps/mobile/CLAUDE.md` (which points to `AGENTS.md`) warning that the installed Expo SDK is newer than the model's training data — consult the versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing Expo/RN code there instead of relying on memorized APIs.

## Architecture

### Backend: single Express app, dual route mounts
Everything lives in `backend/src/app.ts` (one file, ~2000 lines) exporting a single `app`. `backend/src/index.ts` calls `app.listen()` for local dev; `backend/api/index.ts` re-exports the same `app` as the Vercel serverless entrypoint — there's only one Express app, run two different ways.

Every router is mounted **twice**, once at its bare path and once under `/api/`, e.g.:
```ts
app.use("/tasks", authenticate, tasksRouter);
app.use("/api/tasks", authenticate, tasksRouter);
```
This exists because Vercel routes `/api/*` to this function while local dev hits it unprefixed. When adding a new route, mount it both ways to keep local and prod behavior identical.

Auth is a Google ID-token bearer check (`Authorization: Bearer <idToken>`), verified via `google-auth-library` against a list of acceptable OAuth client IDs (web/iOS/Android/Expo — see `googleAudiences`). There is no session/JWT of TaskFlow's own; `authenticate` middleware populates `req.authUser` from the verified Google payload, and `upsertUserProfile()` lazily creates/updates a local `UserProfile` row keyed on `authEmail` on first request. New users are auto-enrolled into a default "Genel" workspace via `ensureDefaultWorkspaceForUser()`.

Authorization is workspace-membership based: nearly every task/workspace/comment endpoint re-checks `getWorkspaceMember(userProfileId, workspaceId)` and further checks `role === "OWNER"` for owner-only actions (rename/delete workspace, remove member). There's no central authorization middleware — each handler does its own membership/role check inline.

### Data model (`backend/prisma/schema.prisma`)
PostgreSQL via Prisma. Core entities: `UserProfile` (app-level user, distinct from the Google identity), `Workspace`, `WorkspaceMember` (join table with `role`), `Task` (belongs to a `Workspace`), `TaskComment`, `Invitation` (token-based, email-addressed, with expiry), `Notification` (comment + reminder types, fanned out to all workspace members). Local dev DB is SQLite (`backend/prisma/dev.db`) per some scripts, but the schema's configured provider is `postgresql` — check `DATABASE_URL` before assuming which is active.

Reminder notifications are created lazily: `createDueReminderNotifications()` runs a claim-then-notify sweep (via `updateMany` with `reminderNotifiedAt: null` as an optimistic lock) every time `GET /notifications` is called, rather than via a background job/cron.

Several field names on `Task` (`vehicle`, `customer`, `area`, `responsible`) are vestigial from an earlier domain model — the validation layer (`validateTaskPayload`) always sets them to `""` and they're unused by the current UI. Don't extend features around them without checking whether they're actually load-bearing.

Domain vocabulary (statuses/priorities) is Turkish and validated against fixed allow-lists in `app.ts`: `allowedPriorities = ["Acil", "Yüksek", "Orta", "Düşük"]`, `allowedStatuses = ["Yapılacak", "Tamamlandı"]`. User-facing error strings in the backend are also Turkish — match that when adding endpoints.

### Frontend: hooks own state, `App.tsx` wires it together
`frontend/src/App.tsx` is the composition root — it has no business logic of its own beyond UI state (menus open/closed, form drafts) and delegates domain state to hooks in `frontend/src/hooks/`:
- `useAuthSession` — Google sign-in, ID token, guest/login view state
- `useWorkspaceManager` — workspace list/create/rename/delete, active workspace
- `useTaskCrud` — task list + create/update/delete against the backend
- `useTaskTableInteractions` — table sorting/column-resize/selection UI state
- `useAppUiEffects` — misc effects (media queries, click-outside, etc.)

Components are organized by role under `frontend/src/components/`: `auth/` (landing/login/contact, pre-authentication), `layout/` (app shell: sidebar, top bar, modals) with `layout/sidebar/` and `layout/workspace/` sub-areas, `tasks/` (the task table itself), `ui/` (shared primitives like `Icons.tsx`). Each component generally pairs a `.tsx` with a co-located `.css` file (no CSS-in-JS, no Tailwind).

`API_URL` (`frontend/src/constants.ts`) defaults to `/api` and is proxied to `localhost:4000` by `vite.config.ts` in dev; in prod it's same-origin via the Vercel route. Shared types come from local `frontend/src/types.ts` — the `@taskflow/shared` package exists but frontend does not currently import from it for `Task`/`Workspace`/etc. (those are still duplicated locally); check both when changing a shared shape.

Tests use Vitest + Testing Library (`jsdom` environment, `frontend/src/test/setup.ts`). Test files are co-located (`*.test.ts(x)`), e.g. `utils.test.ts`, `components/layout/sidebar/SidebarFooter.test.tsx`.

### Cross-cutting
- The Gemini-backed "AI refine text" endpoint (`POST /api/ai/refine-text`) tries a list of fallback models (`gemini-2.5-flash` → `gemini-2.0-flash` → `gemini-1.5-flash`) and both `v1beta`/`v1` API versions before failing — if you touch it, preserve the fallback behavior rather than hardcoding one model.
- Invitation acceptance canonicalizes Gmail addresses (strips dots and `+tag`) via `canonicalizeEmailForInvite()` so `a.b+x@gmail.com` and `ab@gmail.com` are treated as the same invitee — reuse this helper anywhere invitee identity is compared, don't compare raw emails.
- CORS origin allow-list (`allowedOrigins` in `app.ts`) is built from `FRONTEND_URL` + localhost + `VERCEL_URL`; new deploy targets need `FRONTEND_URL` set, not a code change.
