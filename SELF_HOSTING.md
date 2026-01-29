# Self-hosting Tandem

Run your own Tandem instance with your own data. The Docker images do not include runtime secrets or data; access is controlled by your database configuration.

## Requirements
- Docker with Compose support
- Either a Supabase project OR local storage for PGlite

## Database options

### Option 1: Supabase (cloud)

#### 1) Create your Supabase project
Run `apps/backend/sql/schema.sql` in the Supabase SQL editor to create the schema and default categories.

#### 2) Configure environment variables
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

### Option 2: PGlite (local)

#### 1) Configure environment variables
Create a `.env` file in the repo root:

```
PGLITE_DATA_DIR=./data/pglite
```

Optional PGlite settings:
```
PGLITE_SNAPSHOT_PATH=./data/tandem-db.tar
PGLITE_SNAPSHOT_INTERVAL_MS=3600000
```

The backend will automatically create the schema when using PGlite.

#### 2) Sync from Supabase (optional)
If you have an existing Supabase project and want to migrate data to local PGlite:

```
cd apps/backend
bun run sync-supabase
```

Add `--replace` to clear local data before syncing.

## Run with Docker Compose
For local or self-hosted deployments using the repo build:

```
docker compose up --build
```

The backend will detect whether you've configured Supabase or PGlite based on your `.env` file and use the appropriate database.

## Using published Docker images
If you publish Docker images and someone wants to self-host:

### With Supabase:
- Use their own Supabase project and credentials.
- Pass `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` to the backend container at runtime.
- Set `API_BASE_URL` for the frontend so it can reach the backend.

### With PGlite:
- Pass `PGLITE_DATA_DIR` to the backend container at runtime.
- Mount a volume for the data directory to persist data across container restarts.
- Optionally configure `PGLITE_SNAPSHOT_PATH` and `PGLITE_SNAPSHOT_INTERVAL_MS`.
- Set `API_BASE_URL` for the frontend so it can reach the backend.

Do not ship real credentials in a public image.

## Data access and isolation

### Supabase mode
- Data is isolated by Supabase project. No one can access your data unless they have your keys.
- Never share `.env` files or embed real credentials in images.

### PGlite mode
- Data is stored locally in the directory specified by `PGLITE_DATA_DIR`.
- Protect filesystem access to prevent unauthorized data access.
- Use snapshots to backup your data periodically.

## Realtime updates
Tandem uses Server-Sent Events (SSE) for automatic refresh functionality. The backend sends change notifications to connected clients via the `/realtime` endpoint when data is modified. This works in both Supabase and PGlite modes without additional configuration.
