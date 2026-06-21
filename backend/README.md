# Rental App — Backend

Backend scaffold with Express + TypeScript + Prisma (SQLite for local dev).

Quick start:

```bash
cd rental-app/backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

API endpoints:

- `GET /tasks` — list tasks
- `POST /tasks` — create task (payload: `title`, `vehicle`, `customer`, `area`, `responsible`, `description`, `status`)
- `GET /tasks/:id`, `PUT /tasks/:id`, `DELETE /tasks/:id`

Model fields (Türkçe): `gorev adı` -> `title`, `arac` -> `vehicle`, `musteri` -> `customer`, `alan` -> `area`, `sorumlu kisi` -> `responsible`, `aciklama` -> `description`.
