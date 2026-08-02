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

- `GET /tasks` — list tasks
- `POST /tasks` — create task (payload: `title`, `vehicle`, `customer`, `area`, `responsible`, `description`, `priority`)
- `GET /tasks/:id`, `PUT /tasks/:id`, `DELETE /tasks/:id`

Model fields (Türkçe): `gorev adı` -> `title`, `arac` -> `vehicle`, `musteri` -> `customer`, `alan` -> `area`, `sorumlu kisi` -> `responsible`, `aciklama` -> `description`, `onem` -> `priority` (Acil, Yüksek, Orta, Düşük).

Environment:

- `DATABASE_URL` should point to PostgreSQL, e.g. `postgresql://postgres:postgres@localhost:5432/taskflow?schema=public`
