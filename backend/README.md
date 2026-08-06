# TaskFlow — Backend

Backend scaffold with Express + TypeScript + Prisma (PostgreSQL).

Quick start:

```bash
cd TaskFlow/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

API endpoints:

- `GET /workspaces` — list workspaces where authenticated user is a member
- `POST /workspaces` — create workspace and owner membership
- `PUT /workspaces/:id` — rename workspace (owner only)
- `DELETE /workspaces/:id` — delete workspace (owner only)
- `GET /tasks` — list tasks from all workspaces where authenticated user is a member
- `POST /tasks` — create task (payload: `title`, `description`, `priority`, `status`, `workspaceId`)
- `GET /tasks/:id`, `PUT /tasks/:id`, `DELETE /tasks/:id`
- `POST /api/invitations` — authenticated invitation email sender (payload: `inviteeEmail`, `workspaceId`, optional `message`)
- `POST /api/invitations/accept` — accept invitation by token (payload: `token`)

Model fields (Türkçe): `gorev adı` -> `title`, `arac` -> `vehicle`, `musteri` -> `customer`, `alan` -> `area`, `sorumlu kisi` -> `responsible`, `aciklama` -> `description`, `onem` -> `priority` (Acil, Yüksek, Orta, Düşük).

Environment:

- `DATABASE_URL` should point to PostgreSQL, e.g. `postgresql://postgres:postgres@localhost:5432/taskflow?schema=public`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` should be configured to send contact form emails.
- `FRONTEND_URL` should be configured so invitation emails can include the correct invite link host.
- `GEMINI_API_KEY` should be configured to enable `/api/ai/refine-text` in local and Vercel environments.
