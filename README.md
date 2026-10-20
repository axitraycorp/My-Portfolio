# Fullstack Portfolio — Next.js Frontend + NestJS Backend

My personal developer portfolio:

- **Frontend** (repo root): [Next.js 15](https://nextjs.org/) App Router, React 19, Tailwind CSS v4, TypeScript, framer-motion
- **Backend** (`/backend`): [NestJS 11](https://nestjs.com/), Prisma ORM, PostgreSQL
- **APIs**: GraphQL (Apollo) and REST

---

## ✨ Features

- Project showcase loaded from the backend, with skills as tags. The site falls back to built-in sample projects if the API is unreachable.
- Contact form: emails you via [Resend] and also stores each message in Postgres
- Admin-only project/skill management (`/projects/new`), protected by an admin token
- Light/dark theme following the OS setting
- Sitemap and robots.txt generated on build

---

## 🗂️ Project Structure

```
/                     Next.js frontend
├── src/app           pages + /api/contact route
├── src/components    UI components
├── src/config        site-wide details (name, links, URL)
├── src/data          project data loader + fallback projects
└── backend/          NestJS API
    ├── prisma/       schema & migrations
    └── src/          modules: project, skill, contact, auth (admin guard)
```

---

## 🚀 Setup & Run

### Backend (port 5000)

```bash
cd backend
cp .env.example .env        # set DATABASE_URL and ADMIN_TOKEN
npm install
npx prisma migrate deploy   # apply migrations
npm run start:dev
```

GraphQL is at http://localhost:5000/graphql.

### Frontend (port 3000)

From the repo root:

```bash
cp .env.example .env.local  # set RESEND_API_KEY and CONTACT_FORM_TO
npm install
npm run dev
```

### Adding projects

Open http://localhost:3000/projects/new and enter the `ADMIN_TOKEN` from `backend/.env`. You can create skills inline. Write operations (`POST`/`PATCH`/`DELETE` on REST, and GraphQL mutations other than `sendContactMessage`) require the `x-admin-token` header.

---

## 🧪 Tests

```bash
npm test                    # frontend (Vitest)
cd backend && npm test      # backend unit tests (Jest)
```

---

## ⚙️ Environment variables

| Where | Variable | Purpose |
| --- | --- | --- |
| frontend | `NEXT_PUBLIC_SITE_URL` | Public site URL (metadata, sitemap) |
| frontend | `NEXT_PUBLIC_API_URL` | Backend URL, default `http://localhost:5000` |
| frontend | `RESEND_API_KEY`, `CONTACT_FORM_TO` | Contact form email delivery |
| frontend | `CONTACT_FORM_FROM` | Optional verified sender address |
| backend | `DATABASE_URL` | Postgres connection string |
| backend | `ADMIN_TOKEN` | Secret for admin write operations |
| backend | `FRONTEND_ORIGIN` | Comma-separated CORS origins |
| backend | `PORT` | API port, default `5000` |

[Resend]: https://resend.com
