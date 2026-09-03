# TaskFlow Vercel Deploy Guide

This project is configured as a monorepo deployment:

- Frontend (Vite static app)
- Backend (Express serverless function at `/api/*`)

## 1) Prerequisites

- GitHub repo connected to Vercel, or Vercel CLI access
- Google OAuth client configured
- A production database URL

Important:

- Prisma datasource is configured for PostgreSQL.
- Set `DATABASE_URL` to a reachable PostgreSQL instance in production.

## 2) Environment Variables (Vercel Project Settings)

Add these variables in Vercel:

- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client id for frontend
- `GOOGLE_CLIENT_ID`: same client id for backend token verification
- `FRONTEND_URL`: your Vercel production URL (for CORS), e.g. `https://your-project.vercel.app`
- `DATABASE_URL`: production database connection string
- `SMTP_HOST`: SMTP host, e.g. `smtp.gmail.com`
- `SMTP_PORT`: SMTP port, e.g. `587`
- `SMTP_SECURE`: `true` for SSL (typically port 465), otherwise `false`
- `SMTP_USER`: SMTP username/email
- `SMTP_PASS`: SMTP password or app password
- `SMTP_FROM`: sender email shown in contact request mails
- `GEMINI_API_KEY`: Gemini API key for AI text improvement endpoint
- `GEMINI_MODEL`: optional, recommended `gemini-2.5-flash`

Optional:

- `VITE_API_URL`: keep empty for same-domain deploy (`/api` default is already configured)
- `VITE_MOBILE_APK_URL`: Android APK download URL shown on the `/indir` invite landing page. Defaults to `https://github.com/ako35/taskflow/releases/latest/download/taskflow.apk`, so only set this to override. To publish a new APK: run `eas build -p android --profile preview` in `apps/mobile/`, download the artifact, and upload it as `taskflow.apk` to a GitHub Release (the `latest` release is served automatically).
- `VITE_MOBILE_IOS_URL`: iOS TestFlight public invite link shown on the `/indir` page. Empty by default — while empty the page hides the iPhone button and shows an "iOS hazırlanıyor" note. Set it to the public link from App Store Connect → TestFlight once the first build is live. Full setup: `apps/mobile/DEPLOY_IOS.md`.

## 3) Routing and Build

This repository already includes `vercel.json` at root:

- Routes `/api/*` to `backend/api/index.ts`
- Serves frontend static files
- Falls back to `/index.html` for SPA routes

## 4) Deploy from Dashboard (recommended)

1. Import repository into Vercel.
2. Keep project root as repository root (`taskflow`).
3. Add environment variables listed above.
4. Deploy.

Important for env changes:

- If you add/change `GEMINI_API_KEY` (or any env var) after initial deploy, trigger a redeploy so serverless functions pick up the new value.

## 5) Deploy from CLI

From repository root:

```bash
npx vercel
npx vercel --prod
```

If prompted, complete login and project linking.

## 6) Post-deploy Checks

- Open `https://your-project.vercel.app/health` (should return app page unless routed)
- Open `https://your-project.vercel.app/api/health` (should return `{ "status": "ok" }`)
- Login with Google and create/read/update/delete a task
- Open a task title/description AI improvement action and confirm response is successful (no `GEMINI_API_KEY` error)

## 8) One-time Vercel CLI env setup (optional)

From repository root, you can set env vars with CLI:

```bash
vercel env add GEMINI_API_KEY production
vercel env add GEMINI_API_KEY preview
vercel env add GOOGLE_CLIENT_ID production
vercel env add VITE_GOOGLE_CLIENT_ID production
vercel env add FRONTEND_URL production
```

Then redeploy:

```bash
npx vercel --prod
```

## 7) Database Migration Note

Run Prisma migration commands against your PostgreSQL database before production use.
