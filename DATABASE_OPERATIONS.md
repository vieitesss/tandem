# Database Operations Guide

This document provides safety guidelines and best practices for working with Tandem's database systems.

## Database Modes

Tandem supports two database modes:

1. **Cloud Mode (Supabase)**: Multi-user cloud database with built-in replication
2. **Local Mode (PGlite)**: Embedded single-process database for local development

## Configuration Priority

If both `PGLITE_DATA_DIR` and Supabase credentials are set, **PGlite takes precedence**. The backend will log a warning when both are configured.

## PGlite Safety Guidelines

### Concurrent Access Restrictions

⚠️ **CRITICAL**: PGlite does not support concurrent access from multiple processes.

**What this means:**
- Only one backend instance can access a PGlite database directory at a time
- Running multiple instances pointing to the same `PGLITE_DATA_DIR` will cause data corruption
- The system automatically creates a lock file (`.pglite.lock`) to detect concurrent access

**Lock file behavior:**
- Created when backend starts with PGlite mode
- Contains process ID and timestamp
- Automatically removed on graceful shutdown
- Checked on startup - if an active process is detected, startup will fail
- Stale lock files (from crashed processes) are automatically cleaned up

### Snapshot System

PGlite uses periodic snapshots for data backup:

**Configuration:**
- `PGLITE_SNAPSHOT_PATH`: Location of snapshot file (default: `./data/tandem-db.tar`)
- `PGLITE_SNAPSHOT_INTERVAL_MS`: Snapshot frequency in milliseconds (default: 3600000 = 1 hour)

**Features:**
- Automatic periodic snapshots
- Retry mechanism with exponential backoff (3 attempts)
- Keeps up to 3 backup snapshots with timestamps
- Atomic write using temporary files
- Initial database seeding from snapshot if no data exists

**Monitoring:**
Check snapshot health via the `/health` endpoint:

```bash
curl http://localhost:4000/health
```

Response includes:
```json
{
  "status": "ok",
  "database": "local",
  "snapshot": {
    "lastAttempt": "2024-01-27T12:00:00.000Z",
    "lastSuccess": "2024-01-27T12:00:00.000Z",
    "lastError": null,
    "consecutiveFailures": 0
  }
}
```

### Backup Strategy

**For PGlite (local mode):**

1. **Automatic backups**: Snapshots are created automatically
2. **Manual backup**: Copy the entire `PGLITE_DATA_DIR` directory
3. **Before risky operations**: Always backup before running migrations or data modifications

```bash
# Manual backup
cp -r ./data/tandem-db ./data/tandem-db.backup.$(date +%Y%m%d_%H%M%S)
```

**For Supabase (cloud mode):**
- Use Supabase's built-in backup features
- Export data via Supabase dashboard
- Consider daily backups for production

## Data Migration

### Supabase → PGlite

```bash
cd apps/backend

# Merge mode (keeps existing local data)
bun run sync-supabase

# Replace mode (clears local data first)
bun run sync-supabase --replace

# Use custom .env file
bun run sync-supabase --env .env.production
```

**Safety checklist:**
- [ ] Backup existing local data (if any)
- [ ] Verify Supabase credentials in `.env`
- [ ] Ensure `PGLITE_DATA_DIR` is set
- [ ] Use `--replace` with caution (destructive)
- [ ] Verify data after migration

### PGlite → Supabase

Currently not automated. Options:

1. **Manual export/import**: Use SQL dumps
2. **Application-level**: Use the API to read from PGlite and write to Supabase
3. **Reverse sync script**: Adapt the sync script to work in reverse (future enhancement)

## Production Deployment

### Using PGlite in Production

⚠️ **Important considerations:**

**Recommended for:**
- Single-user personal deployments
- Development/testing environments
- Low-traffic self-hosted instances
- Scenarios where data locality is important

**NOT recommended for:**
- Multi-user production deployments
- High-availability requirements
- Distributed/scaled architectures
- Critical data without external backups

**If using PGlite in production:**
1. Set up external backup system
2. Monitor snapshot status via health endpoint
3. Use persistent volumes in Docker/Kubernetes
4. Test restore procedures regularly
5. Have migration path to Supabase ready

### Using Supabase in Production

✅ **Recommended for most production deployments**

**Advantages:**
- Multi-user support
- Built-in replication and backups
- High availability
- Managed infrastructure
- Realtime subscriptions

**Best practices:**
1. Use dedicated Supabase project per environment
2. Enable automatic backups
3. Set up monitoring and alerts
4. Use connection pooling for high traffic
5. Implement row-level security policies

## Docker Deployment

### Volume Mounts

**For PGlite:**
```yaml
volumes:
  - ./data:/data  # Persist PGlite data
```

**Important:**
- Ensure volume has correct permissions
- Don't mount same volume to multiple containers
- Use named volumes for production

### Health Checks

Both modes support health checks:

```yaml
healthcheck:
  test: >
    curl -f http://localhost:4000/health || exit 1
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Troubleshooting

### PGlite Issues

**"Database already in use" error:**
- Another process is accessing the same `PGLITE_DATA_DIR`
- Check for stale lock files: `rm ./data/tandem-db/.pglite.lock`
- Verify no other backend instances are running

**Snapshot failures:**
- Check disk space
- Verify write permissions on snapshot directory
- Review logs for specific error messages
- Check health endpoint for `consecutiveFailures` count

**Data corruption:**
- Stop all processes accessing the database
- Restore from latest snapshot
- If no snapshot, restore from manual backup

**Performance issues:**
- PGlite is designed for small to medium datasets
- Consider migrating to Supabase for large datasets
- Check disk I/O performance

### Supabase Issues

**Connection errors:**
- Verify credentials in `.env`
- Check Supabase project status
- Verify network connectivity
- Check rate limits

**Slow queries:**
- Review Supabase dashboard for slow queries
- Add appropriate indexes
- Optimize query patterns

## Emergency Procedures

### Data Recovery (PGlite)

1. **Stop the backend**
2. **Locate latest snapshot**: Check for `.tar` files in data directory
3. **Clear corrupted data**: `rm -rf ./data/tandem-db/*`
4. **Set snapshot path**: Ensure `PGLITE_SNAPSHOT_PATH` points to good snapshot
5. **Restart backend**: Will load from snapshot

### Database Switch (Emergency)

**PGlite → Supabase:**

1. Export current data:
```bash
bun run sync-supabase --env .env.supabase
```

2. Update `.env`:
```bash
# Comment out or remove PGLITE_DATA_DIR
# PGLITE_DATA_DIR=./data/tandem-db
SUPABASE_URL=your_url
SUPABASE_SERVICE_ROLE_KEY=your_key
```

3. Restart backend

## Best Practices Summary

✅ **DO:**
- Always backup before risky operations
- Monitor snapshot status in production
- Test restore procedures regularly
- Use appropriate database mode for your use case
- Keep PGlite data directories exclusive to one process
- Review health endpoint regularly

❌ **DON'T:**
- Run multiple backends against same PGlite directory
- Use PGlite for high-availability production deployments
- Skip backups when using PGlite
- Ignore snapshot failures
- Share `.env` files or commit them to version control
- Use `--replace` without backups
