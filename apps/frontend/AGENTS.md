# apps/frontend/AGENTS.md

This app is a Next.js (App Router) frontend using React and Tailwind.

## Commands
- Install: `bun install`
- Dev: `bun run dev`
- Build: `bun run build`
- Start (prod): `bun run start`

## Environment
- The app proxies backend requests via a Next.js route handler (so client code can call `/api/...`).
- `API_BASE_URL` is used by that proxy (docker-compose sets it to `http://backend:4000`; local dev is typically `http://localhost:4000`).
- Supabase keys are passed through compose as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Frontend Conventions
- Keep React components as function components; hooks at top level.
- Tailwind only (avoid custom CSS unless necessary).
- Client-side API calls should generally hit the internal proxy (`/api/...`) and keep payload keys snake_case.
