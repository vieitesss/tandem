# AGENTS.md

## Scope
- Applies to the entire `tandem` repository.
- No other `AGENTS.md` files exist in this repo.

## Repo Map
- `apps/backend`: Express API (CommonJS, Node).
- `apps/frontend`: Next.js app router (ESM, React).
- `compose.yaml`: Docker Compose for local dev.
- `apps/**/package.json`: App scripts and dependencies.

## Cursor/Copilot Rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.

## Commands
### Frontend (`apps/frontend`)
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Start (prod): `npm run start`
- Lint: not configured
- Test: not configured
- Single test: not available (no test runner configured)

### Backend (`apps/backend`)
- Install: `npm install`
- Dev server: `npm run dev` (nodemon)
- Start (prod): `npm run start`
- Build: not configured
- Lint: not configured
- Test: not configured
- Single test: not available (no test runner configured)

### Docker Compose (repo root)
- Build and run: `docker compose up --build`
- Stop: `docker compose down`
- Uses `.env` for Supabase credentials.

## Environment Variables
### Backend
- `SUPABASE_URL` (required)
- `SUPABASE_SERVICE_ROLE_KEY` (required)
- `PORT` (optional, default `4000`)
- `CORS_ORIGIN` (optional, default `*`)

### Frontend
- `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:4000`)
- `NEXT_PUBLIC_SUPABASE_URL` (used by frontend env, via compose)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (used by frontend env, via compose)

## Code Style (General)
- Language: JavaScript only; no TypeScript in repo.
- Module format:
  - Backend uses CommonJS (`require`, `module.exports`).
  - Frontend uses ESM (`import`, `export`).
- Indentation: 2 spaces.
- Quotes: double quotes.
- Semicolons: required.
- Prefer `const` for bindings; use `let` only when reassigned.
- Keep functions small and focused; prefer early returns.
- Prefer `async/await` for async flows.
- Use `Number()` for coercions; avoid implicit coercion.
- Avoid one-letter names except common indices (`i`, `j`) in tight scopes.
- Keep payload field names consistent with database schema (snake_case).

## Imports and Modules
- Order imports: third-party, then local modules.
- Keep side-effect imports (e.g., CSS) at the top of the file.
- Prefer named imports when available (`{ createClient }`).
- Use relative paths for local files within the same app.
- Avoid importing from `node_modules` paths directly.
- Do not mix CommonJS and ESM in the same file.
- Keep per-file exports near the bottom for quick discovery.

## Code Style (Frontend)
- Next.js App Router conventions:
  - `app/layout.js` exports `metadata` and a default layout component.
  - Route components live under `app/**/page.js`.
- React components:
  - Use function components, not classes.
  - Hooks at top level; no conditional hooks.
  - `useMemo` for derived values; `useEffect` for side effects.
- Props naming: camelCase (e.g., `splitMode`, `beneficiaryId`).
- State naming: use `[value, setValue]` pattern.
- JSX formatting:
  - Multi-line props, one per line when readable.
  - Use ternaries for conditional rendering; return `null` when empty.
- Tailwind CSS:
  - Utility classes are composed directly in JSX.
  - Keep class lists grouped by layout, spacing, color.
- API calls:
  - Fetch against `NEXT_PUBLIC_API_BASE_URL` with a fallback to localhost.
  - Serialize payloads with `JSON.stringify` and set `Content-Type` header.
- API payloads:
  - Keep snake_case keys for API compatibility (e.g., `payer_id`).

## Code Style (Backend)
- Express patterns:
  - Use `app.get`/`app.post` with async handlers.
  - Parse JSON with `express.json()`.
- Validation:
  - Guard inputs early and return `400` with a clear error message.
- Error handling:
  - Return `500` with `error.message` for Supabase failures.
  - Prefer early `return res.status(...).json(...)` to avoid nested branches.
- Supabase usage:
  - Use `.select(...).single()` when expecting one row.
  - Check `{ error }` after each request.
- Data shapes:
  - Keep DB column naming (snake_case) in request/response payloads.
  - Normalize numeric values with `Number(...)` and `toFixed(2)` where needed.

## Naming Conventions
- Files: lowercase with `.js` extension.
- Functions: `camelCase` and verbs for actions (`addSplit`, `removeSplit`).
- React components: `PascalCase` (`TransactionForm`).
- Constants: `camelCase` for locals, `SCREAMING_SNAKE_CASE` only for env vars.
- CSS classes: Tailwind utilities only; avoid custom CSS unless needed.

## Error Handling Expectations
- Frontend:
  - Catch fetch errors; surface to UI via state.
  - Reset form state after successful submission.
- Backend:
  - Validate input payloads and return actionable error strings.
  - Handle missing Supabase credentials on startup and exit with nonzero code.

## Data Handling
- Keep monetary math explicit and rounded via `toFixed(2)`.
- Normalize incoming numeric strings using `Number(...)` early.
- Prefer immutable array updates (`map`, `filter`, spread).

## Testing Guidance
- No testing framework is configured in this repo.
- If adding tests, introduce a script in `package.json` and document it here.
- Prefer writing tests close to their module (e.g., `*.test.js`).

## Linting/Formatting Guidance
- No linting or formatting scripts are configured.
- Maintain existing style (2 spaces, double quotes, semicolons).
- Keep JSX readable and avoid excessive nesting.

## Typical Development Flow
- Start backend dev server in `apps/backend`.
- Start frontend dev server in `apps/frontend`.
- Alternatively, use `docker compose up --build` from repo root.

## Notes for Agents
- Do not add new tooling unless requested.
- Keep payload field names consistent with database schema (snake_case).
- Avoid touching `node_modules` directories.
