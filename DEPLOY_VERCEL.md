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

Optional:

- `VITE_API_URL`: keep empty for same-domain deploy (`/api` default is already configured)

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

## 7) Database Migration Note

Run Prisma migration commands against your PostgreSQL database before production use.
