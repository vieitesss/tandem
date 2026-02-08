# AGENTS.md

This is a shared file for both the project owner and the coding agent.
Use it as the source of truth for project working agreements.

## Project Scope and Usage

### Scope
Tandem is a monorepo with:
- `apps/frontend`: Next.js App Router + Tailwind
- `apps/backend`: Express API + Supabase

### Stack and Conventions
- JavaScript only
- Frontend uses ESM
- Backend uses CommonJS
- Package manager: Bun
- Formatting: 2 spaces, double quotes, semicolons
- API payload keys: snake_case
- Avoid adding new tooling unless requested

### Local Usage
- Start local environment: `docker compose up --build`
- Uses `.env` for local Supabase credentials

### More Guidance
- Frontend: `apps/frontend/AGENTS.md`
- Backend: `apps/backend/AGENTS.md`

### Browser Automation
Use `agent-browser` for web automation. Run `agent-browser --help` for all commands.

Core workflow:
1. `agent-browser open <url>`
2. `agent-browser snapshot -i`
3. `agent-browser click @e1` / `agent-browser fill @e2 "text"`
4. Re-snapshot after page changes

After browser automation, remove any database changes made during testing.

### Database Safety
- Do not update the main Supabase database
- By default, update the local pglite database
- If Supabase must be updated, use only the dev Supabase with credentials from `.env.demo`

## My Own Likings

- Keep the codebase clean and organized
- The application styling must follow best design practices and be visually appealing
- The application must be responsive and work well on different screen sizes
- The application must follow best UX practices and be easy to use
- If you are going to write the same code in multiple places, create a reusable function or component instead
- Preserve existing patterns unless asked to refactor
- Ask before adding dependencies
- Do not commit unless explicitly requested

## Went Wrong / Solved

- Add short notes here as we work
- The coding agent must update this section whenever an issue is reported or a fix is completed
- Solved format: `issue - solution`
- Unsolved format: `issue - open`
- Example solved: `docker build failed due to missing env - added required local .env values`
- Example open: `seed script fails on fresh DB - open`

### Notes
- existing deployments could miss data format updates - added idempotent backend migration runner (`bun run db:migrate`) with startup execution
- transaction amount sign wrapped on narrow screens and mobile row expansion missed note content - made amount display non-wrapping and added note line to expanded mobile transaction details
- mobile row expansion repeated category already visible in row - removed category line from expanded mobile transaction details
- mobile keyboard closed after each key while editing transaction note - stabilized modal focus effect to avoid refocus on every draft change
- deleting last transaction from oldest month left stale month in dropdown - added auto-navigation to latest month when current month no longer exists after delete
