<p align="center">
  <img src="assets/icon.png" alt="Tandem logo" width="140" />
</p>

<h1 align="center">Tandem</h1>

<p align="center">
  <img src="https://img.shields.io/github/license/vieitesss/tandem?cacheSeconds=300" alt="License" />
  <img src="https://img.shields.io/github/last-commit/vieitesss/tandem?cacheSeconds=300" alt="Last commit" />
  <img src="https://img.shields.io/github/issues/vieitesss/tandem?cacheSeconds=300" alt="Open issues" />
  <img src="https://img.shields.io/github/stars/vieitesss/tandem?cacheSeconds=300" alt="Stars" />
</p>

Tandem is a lightweight expense-splitting app for partners. Create profiles, log expenses or income, and keep track of who paid what with clear splits and monthly filters.

## What it does
- Track shared expenses, income, and liquidation payments.
- Split expenses by custom percentages or default profile splits.
- Review transactions with filters for month, type, and category.
- Manage partner profiles and default split percentages.

## Screenshots
<details>
<summary>Desktop</summary>

**Add transaction (1)**
![Desktop add transaction 1](assets/desktop/add-1.jpeg)

**Add transaction (2)**
![Desktop add transaction 2](assets/desktop/add-2.jpeg)

**Categories**
![Desktop categories](assets/desktop/categories.jpeg)

**Profiles**
![Desktop profiles](assets/desktop/profiles.jpeg)

**Timeline**
![Desktop timeline](assets/desktop/timeline.jpeg)

**Transactions (1)**
![Desktop transactions 1](assets/desktop/transactions-1.jpeg)

**Transactions (2)**
![Desktop transactions 2](assets/desktop/transactions-2.jpeg)

**Transactions edit**
![Desktop transactions edit](assets/desktop/transactions-edit.png)
</details>

<details>
<summary>Mobile</summary>

**Add transaction (1)**
![Mobile add transaction 1](assets/mobile/add-1.png)

**Add transaction (2)**
![Mobile add transaction 2](assets/mobile/add-2.png)

**Categories**
![Mobile categories](assets/mobile/categories.png)

**Profiles**
![Mobile profiles](assets/mobile/profiles.png)

**Timeline (1)**
![Mobile timeline 1](assets/mobile/timeline-1.png)

**Timeline (2)**
![Mobile timeline 2](assets/mobile/timeline-2.png)

**Timeline (3)**
![Mobile timeline 3](assets/mobile/timeline-3.png)

**Transactions (1)**
![Mobile transactions 1](assets/mobile/transactions-1.png)

**Transactions (2)**
![Mobile transactions 2](assets/mobile/transactions-2.png)

**Transactions (3)**
![Mobile transactions 3](assets/mobile/transactions-3.png)
</details>

## Setup
For production-style self-hosting with Docker images, see `SELF_HOSTING.md`.

### Prerequisites
- Bun installed.
- Either a Supabase project OR a local PGlite database.

### Database setup

#### Option 1: Supabase (cloud)
Run `apps/backend/sql/schema.sql` in the Supabase SQL editor to create the full schema and default categories.

Create a `.env` file in the repo root with:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key
```

#### Option 2: PGlite (local)
Create a `.env` file in the repo root with:

```
PGLITE_DATA_DIR=./data/tandem-db
```

Optional PGlite settings:
```
PGLITE_SNAPSHOT_PATH=./data/tandem-db.tar
PGLITE_SNAPSHOT_INTERVAL_MS=3600000
```

**Note**: If both PGlite and Supabase credentials are configured, PGlite takes precedence.

The backend will automatically create the schema when using PGlite.

#### Upgrading existing deployments

Before starting a new backend version, run migrations once in the backend app:

```bash
cd apps/backend
bun run db:migrate
```

The migration runner is safe to rerun and works with both Supabase and PGlite modes.
The backend also executes pending migrations during startup.

##### Migrating data from Supabase to PGlite

To sync data from an existing Supabase project to your local PGlite database:

```bash
cd apps/backend
bun run sync-supabase
```

**Migration modes:**
- **Merge mode** (default): Keeps existing local data and adds/updates with Supabase data
- **Replace mode**: Use `--replace` flag to clear all local data before syncing

```bash
# Replace all local data with Supabase data
bun run sync-supabase --replace
```

**Important notes:**
- Always backup your data before using `--replace` mode
- The sync is one-way (Supabase → PGlite)
- To reverse migration (PGlite → Supabase), manually export and import data
- PGlite does not support concurrent access - ensure only one backend instance accesses the database

### Frontend configuration
For local dev without Docker, set `API_BASE_URL=http://localhost:4000` in `apps/frontend/.env.local`.

### Run with Docker Compose
```
docker compose up --build
```

This starts:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000`

### Run without Docker
Start the backend:

```
cd apps/backend
bun install
bun dev
```

Start the frontend in a separate terminal:

```
cd apps/frontend
bun install
bun dev
```

## Using the app
1. Open `http://localhost:3000`.
2. Go to Profiles and create partner profiles with default split percentages.
3. Return to the home screen to add a transaction:
   - Choose the type (Expense, Income, or Liquidation).
   - Fill in payer/recipient, amount, date, and category.
   - For expenses, choose split mode and set custom percentages if needed.
4. Visit Transactions to review and filter by month, type, or category.

## Transaction types
- Expense: A shared cost that can be split by custom percentages.
- Income: Money received by a partner (no split required).
- Liquidation: A transfer to settle up with the other partner.

## API overview
The frontend proxies requests through `/api/...` using `API_BASE_URL` (defaults to `http://localhost:4000`). The backend stores data in either Supabase (cloud) or PGlite (local) tables: `profiles`, `transactions`, `transaction_splits`, and `categories`.

## Realtime updates
The app uses Server-Sent Events (SSE) for real-time updates instead of Supabase Realtime. When data changes on the backend, connected clients receive automatic refresh notifications via the `/realtime` endpoint.

## Database operations
For detailed information about database safety, backups, migrations, and troubleshooting, see [DATABASE_OPERATIONS.md](DATABASE_OPERATIONS.md).
