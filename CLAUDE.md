# Portfolio — Robotics & Edge AI Engineer

Personal portfolio for a robotics / edge-AI engineer (formerly a hotel manager). The site presents one flagship robot project as a live engineering build log, plus side projects and an AI tour guide ("Unit-7").

- Frontend: Next.js 15 App Router (repo root, `src/`), React 19, Tailwind CSS v4, TypeScript strict.
- Backend: NestJS + Prisma + Neon Postgres in `backend/` (hosted on Render). Only used for the contact-message store and the legacy `/projects/new` admin list.
- Hosting: Vercel (frontend), Render (backend).

## Content rules

- **`src/content/profile.ts` is the single source of truth** for every fact shown on the site and given to the assistant: profile, education, experience, skills, projects, milestones, metrics, tour steps. Components never hard-code personal facts.
- Everything is fully typed; no `any`.
- Never invent facts. Unknown personal details are written as strings starting with `TODO:` and listed when reporting work.
- Metrics stay `"measuring"` until a real measurement exists. Never fabricate numbers.
- Tone: confident, specific, no hype. The hotel-management background is framed as operational strength, not apologised for.

## Visual direction

"Robot perception HUD": the site should feel like looking through the robot's sensors.

- **Dark-first.** Light theme via `[data-theme="light"]` and `prefers-color-scheme`.
- **Colour tokens** (oklch, in `src/styles/tokens.css`): `background`, `surface`, `ink`, `muted`, `line`, `radar` (amber), `camera` (cyan), `fused` (violet — camera + radar), `success`, `warning`. Camera things are cyan, radar things are amber, fused things are violet — keep this mapping consistent everywhere.
- **Fonts** (next/font): Space Grotesk (display/headings), Inter (body), JetBrains Mono (labels, ROS topics, numbers, terminal text).
- **Motifs:** corner-bracket frames (`HudFrame`), ROS-topic labels like `/robot/status` (`TopicLabel`), detection bounding boxes with confidence labels (`BoundingBox`), scan lines, radar sweeps. Use sparingly — content first.
- Generous whitespace, thin 1px lines, small mono caps labels, no drop shadows except glows on interactive focus.

## Motion

- Every animation respects `prefers-reduced-motion` (no movement, instant state).
- Every modern CSS effect (`@property`, scroll-driven animations, `offset-path`, view transitions, container queries) has an `@supports` or feature-detect fallback that still looks finished.
- Boot sequence < 1.5 s, once per session.

## Quality bar

- Lighthouse mobile: Performance ≥ 90, Accessibility 100, Best Practices 100, SEO 100 on `/` and the flagship project page.
- No layout shift from fonts or the 3D scene (reserve space; static SVG fallback).
- 3D scene and assistant are code-split and never block first render.
- No horizontal scroll at 375 px; checked at 375 / 768 / 1440.
- Keyboard: every interactive element reachable, visible focus ring, Escape closes overlays, focus trapped in dialogs.
- WCAG AA contrast in both themes.
- The site never shows a broken assistant: API errors and rate limits fall back to the scripted tour.

## Structure

```
src/content/profile.ts        typed content (single source of truth)
src/styles/tokens.css         design tokens (colours, type, spacing)
src/components/hud/           HudFrame, TopicLabel, StatusPill, BoundingBox, ThemeToggle
src/components/hero/          Hero, boot sequence, lazy R3F scene + SVG fallback
src/components/sections/      page sections rendered from profile.ts
src/components/assistant/     Unit-7 launcher, panel, tool runner, tour
src/lib/assistant/            system prompt builder, validation, rate limit, tool schemas
src/app/api/assistant/        streaming Claude endpoint
e2e/                          Playwright tests
```

## Commands

- `npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm test` (Vitest) · `npm run test:e2e` (Playwright, needs a running build)
- Backend: `cd backend && npm run start:dev` / `npm test`

## Assistant ("Unit-7")

- `POST /api/assistant` streams newline-delimited JSON events (`text`, `tool`, `done`, `error`).
- Model from `ANTHROPIC_MODEL` (default `claude-haiku-5-5`), key from `ANTHROPIC_API_KEY`. Without a key the UI uses the scripted tour.
- Tools are executed in the browser: `scroll_to_section`, `highlight_element`, `open_project`, `show_metric`, `suggest_questions`.
- Section ids used by tools and the tour: `hero`, `robot`, `build-log`, `results`, `projects`, `about`, `contact`.
