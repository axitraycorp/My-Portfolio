# Robotics & Edge AI Portfolio

A portfolio built like a robot's perception HUD. The centrepiece is a camera–radar perception arm (NVIDIA Jetson Orin Nano, ROS 2, TensorRT YOLO, MoveIt 2), presented as an open build log with honest metrics. **Unit-7**, the robot's onboard AI, gives visitors a guided tour and answers questions.

**Live:** https://my-portfolio-umber-ten-96.vercel.app

## What's inside

- **Hero** with a boot sequence and a lazy-loaded React Three Fiber scene (stylised arm, cyan camera frustum, amber radar sweep, detected objects). A static SVG fallback is shown first, and kept under reduced motion or without WebGL.
- **Flagship robot**: spec grid and an animated ROS 2 architecture diagram (CSS `offset-path` data packets).
- **Build log**: six milestones on a timeline that draws itself as you scroll (scroll-driven animations).
- **Results**: metrics table. Values stay "measuring" until a real measurement exists; real numbers count up.
- **Other projects**: cards with a cursor spotlight, `@property` gradient border and container-query layout; they morph into the project page via View Transitions.
- **About**: the hotel-to-robotics story, with a "skills transfer" visual.
- **Contact**: copy-email, GitHub, LinkedIn, CV, and a form (Resend email, plus a copy stored by the backend).
- **Unit-7 assistant**: streaming chat on Claude (`claude-haiku-5-5`). It can scroll, highlight, open projects and point at metrics. Without an API key, or on any error, it falls back to a scripted tour.
- `/styleguide` shows every token and component in both themes.

## Stack

| Part | Tech |
| --- | --- |
| Frontend (repo root) | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, three.js + React Three Fiber |
| AI | Anthropic SDK (`@anthropic-ai/sdk`), streaming tool use, zod validation |
| Backend (`backend/`) | NestJS 11, Prisma, Neon Postgres. Stores contact messages and admin-added projects (`/projects/new`) |
| Testing | Vitest (unit), Playwright + axe-core (e2e, accessibility) |
| Hosting | Vercel (frontend), Render (backend), Neon (database) |

All site content lives in **`src/content/profile.ts`**, the single source of truth. Edit that file to change any text, project, milestone or metric. Values starting with `TODO:` are hidden on the site and never given to the assistant as facts. See `CLAUDE.md` for the design and content rules.

## Local setup

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local     # fill in what you need (all optional for local dev)
npm run dev                    # http://localhost:3000
```

The backend is optional for the frontend; without it, the "More from the lab" list is empty and contact messages are only emailed. To run it:

```bash
cd backend
cp .env.example .env           # DATABASE_URL, ADMIN_TOKEN
npm install
npx prisma migrate deploy
npm run start:dev              # http://localhost:5000
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest unit tests (prompt builder, validation, rate limiter, API route with a mocked SDK) |
| `npm run test:e2e` | Playwright against a production build (scripted tour, axe accessibility, overflow at 375 px and 1440 px) |

## Environment variables

### Frontend (Vercel)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | yes (prod) | Canonical URL for metadata, Open Graph, sitemap |
| `NEXT_PUBLIC_API_URL` | no | NestJS backend URL (default `http://localhost:5000`) |
| `ANTHROPIC_API_KEY` | no | Enables Unit-7 chat. Without it, the scripted tour runs ("offline mode") |
| `ANTHROPIC_MODEL` | no | Model override (default `claude-haiku-5-5`) |
| `RESEND_API_KEY`, `CONTACT_FORM_TO` | for contact form | Email delivery via Resend |
| `CONTACT_FORM_FROM` | no | Sender on a domain verified in Resend |

### Backend (Render)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `ADMIN_TOKEN` | Secret for write operations (`x-admin-token` header) |
| `FRONTEND_ORIGIN` | Comma-separated CORS origins |
| `PORT` | API port (default 5000) |

## Assistant API

`POST /api/assistant` with `{ "messages": [{ "role": "user", "content": "..." }] }` streams newline-delimited JSON events:

```
{"type":"text","text":"Sensors up. "}
{"type":"tool","call":{"name":"scroll_to_section","input":{"sectionId":"robot"}}}
{"type":"done"}
```

- The system prompt is built from `profile.ts` on every request. It enforces the persona, sticks to the portfolio, never invents facts, and treats visitor messages as untrusted (prompt-injection guard).
- Requests are limited to 400 output tokens, the last 12 messages, and 1000 characters per message.
- Rate limit: an in-memory token bucket per IP (8 burst, ~10/min). It's per serverless instance, so swap in Upstash (`@upstash/ratelimit`) for a global limit; see `src/lib/assistant/rate-limit.ts`.
- `503` without a key; `429` when rate limited. The UI switches to the scripted tour on either.

## Deploy

### Frontend → Vercel

The Vercel project `axitray/my-portfolio` exists. Pushes to `main` deploy automatically once the repo is connected (Project → Settings → Git). Set the variables above under Project → Settings → Environment Variables (Production).

Manual deploy from your machine:

```bash
npx vercel deploy --prod
```

### Backend → Render

`render.yaml` defines the `portfolio-api` service (root `backend/`). It auto-deploys on pushes to `main`. Run database migrations separately with `npx prisma migrate deploy` using the production `DATABASE_URL`.

### CI

`.github/workflows/ci.yml` runs on every push and pull request:
- **Frontend:** lint, typecheck, unit tests, a production build with no `ANTHROPIC_API_KEY`, and the Playwright suite.
- **Backend:** build and test.
