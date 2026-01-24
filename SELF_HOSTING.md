# Self-hosting Tandem

Run your own Tandem instance with your own data. The Docker images do not include runtime secrets or data; access is controlled by the Supabase credentials you provide.

## Requirements
- Docker with Compose support
- A Supabase project

## 1) Create your Supabase project
Run `apps/backend/sql/schema.sql` in the Supabase SQL editor to create the schema and default categories.

## 2) Configure environment variables
Create a `.env` file in the repo root:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

Optional:

```
CORS_ORIGIN=https://your-frontend-domain
```

For runtime-configured frontend containers, make sure `SUPABASE_URL` and
`SUPABASE_ANON_KEY` are available at runtime so `/api/config` can expose them.

## 3) Run with Docker Compose
For local or self-hosted deployments using the repo build:

```
docker compose up --build
```

## Using published Docker images
If you publish Docker images and someone wants to self-host, they should:
- Use their own Supabase project and credentials.
- Pass `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the frontend container at runtime.
- Pass `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the backend container at runtime.
- Set `API_BASE_URL` for the frontend so it can reach the backend.

If you distribute a frontend image built with your keys, anyone running it will connect to your Supabase project. Do not ship real credentials in a public image.

## Data access and isolation
- Data is isolated by Supabase project. No one can access your data unless they have your keys.
- Never share `.env` files or embed real credentials in images.

## Automatic refreshes
Automatic refreshes rely on Supabase Realtime. They will work for self-hosters if:
- Their Supabase project has Realtime enabled.
- The frontend container exposes `/api/config` with their `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- Their Supabase policies permit the realtime subscription.
