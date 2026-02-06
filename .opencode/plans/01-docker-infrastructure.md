# Phase 1: Docker Infrastructure Foundation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Docker infrastructure for Typst compilation, PostgreSQL with pgvector, and Redis for background jobs.

**Architecture:** Server-side Typst compilation using Docker container with CLI v0.12.0+, PostgreSQL with pgvector extension for embeddings, Redis for BullMQ job queue.

**Tech Stack:** Docker, Docker Compose, Typst CLI, PostgreSQL 16, pgvector, Redis 7

---

## Prerequisites

- Docker and Docker Compose installed
- Bun package manager installed
- Access to project root: `/home/abdssamie/ChemforgeProjects/10xStudent`

---

## Task 1: Fix PostgreSQL Docker Image

**Files:**

- Modify: `docker-compose.yml:2-31`

**Context:** Current setup uses `postgres:18-bookworm` which doesn't include pgvector extension. The spec requires `pgvector/pgvector:pg16` for vector similarity search on source embeddings.

**Step 1: Update postgres service image**

Replace the postgres service configuration:

```yaml
postgres:
  image: pgvector/pgvector:pg16
  container_name: 10xstudent-postgres
  ports:
    - "${POSTGRES_PORT:-5440}:5432"
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-secure-password}
    POSTGRES_DB: ${POSTGRES_DB:-10xstudent}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
  restart: unless-stopped
```

**Step 2: Test postgres service**

Run: `docker-compose up postgres -d`
Expected: Container starts successfully

**Step 3: Verify pgvector extension**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "CREATE EXTENSION IF NOT EXISTS vector;"`
Expected: `CREATE EXTENSION` or `NOTICE: extension "vector" already exists`

**Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "fix(docker): use pgvector/pgvector:pg16 image for vector support"
```

---

## Task 2: Create Typst Compilation Dockerfile

**Files:**

- Create: `apps/api/Dockerfile.typst`

**Context:** Typst CLI needs to run in isolated Docker container with custom fonts and packages mounted. This provides full Typst feature support (packages, imports, fonts) as specified in the architecture.

**Step 1: Create Dockerfile.typst**

```dockerfile
# Typst Compilation Service Dockerfile
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Install Typst CLI v0.12.0
RUN curl -fsSL https://github.com/typst/typst/releases/download/v0.12.0/typst-x86_64-unknown-linux-musl.tar.xz \
    | tar -xJ -C /usr/local/bin --strip-components=1

# Create directories for fonts and packages
RUN mkdir -p /usr/share/fonts/custom \
    && mkdir -p /root/.local/share/typst/packages

# Set working directory
WORKDIR /workspace

# Expose port for HTTP server (if needed later)
EXPOSE 3001

# Default command: keep container running
CMD ["tail", "-f", "/dev/null"]
```

**Step 2: Build the image**

Run: `docker build -f apps/api/Dockerfile.typst -t 10xstudent-typst:latest apps/api`
Expected: Build completes successfully

**Step 3: Test Typst CLI**

Run: `docker run --rm 10xstudent-typst:latest typst --version`
Expected: `typst 0.12.0`

**Step 4: Commit**

```bash
git add apps/api/Dockerfile.typst
git commit -m "feat(docker): add Typst CLI v0.12.0 compilation container"
```

---

## Task 3: Add Typst Service to Docker ComposeFiles:\*\*

- Modify: `docker-compose.yml:33-35` (after postgres service)

**Context:** Add Typst service to docker-compose for local development. Mount fonts and packages directories for custom resources.

**Step 1: Add typst service**

Add after the postgres service:

```yaml
typst:
  build:
    context: ./apps/api
    dockerfile: Dockerfile.typst
  container_name: 10xstudent-typst
  volumes:
    # Mount custom fonts (create if doesn't exist)
    - ./fonts:/usr/share/fonts/custom:ro
    # Mount Typst packages (create if doesn't exist)
    - ./typst-packages:/root/.local/share/typst/packages:ro
    # Mount workspace for compilation
    - ./tmp/typst-workspace:/workspace
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "typst", "--version"]
    interval: 30s
    timeout: 10s
    retries: 3
```

**Step 2: Create required directories**

Run: `mkdir -p fonts typst-packages tmp/typst-workspace`
Expected: Directories created

**Step 3: Test typst service**

Run: `docker-compose up typst -d`
Expected: Container starts successfully

**Step 4: Verify Typst works in container**

Run: `docker-compose exec typst typst --version`
Expected: `typst 0.12.0`

**Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add Typst compilation service to docker-compose"
```

---

## Task 4: Add Redis Service for BullMQ

**Files:**

- Modify: `docker-compose.yml` (add redis service)

**Context:** Redis is needed for BullMQ background job processing (embedding generation, async compilation). The spec mentions Redis for production caching and the worker app uses BullMQ.

**Step 1: Add redis service**

Add after the typst service:

```yaml
redis:
  image: redis:7-alpine
  container_name: 10xstudent-redis
  ports:
    - "${REDIS_PORT:-6}:6379"
  command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

**Step 2: Add redis volume**

Add to volumes section at bottom:

```yaml
volumes:
  postgres_data:
  redis_data:
```

**Step 3: Test redis service**

Run: `docker-compose up redis -d`
Expected: Container starts successfully

**Step 4: Verify Redis works**

Run: `docker-compose exec redis redis-cli ping`
Expected: `PONG`

**Step 5: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add Redis service for BullMQ job queue"
```

---

## Task 5: Update Environment Variables

**Files:**

- Modify: `.env.example`

**Context:** Add environment variables for Typst compilation service and update Redis configuration.

**Step 1: Add Typst configuration**

Add to `.env.example` after API CONFIGURATION section:

```bash
# ============================================
# TYPST COMPILATION
# ============================================
# Typst compilation timeout in seconds
TYPST_COMPILE_TIMEOUT="30"

# Maximum document size in bytes (1MB default)
TYPST_MAX_DOCUMENT_SIZE="1048576"
```

**Step 2: Update Redis configuration**

Update the REDIS section:

```bash
# ============================================
# REDIS (for BullMQ background jobs)
# ============================================
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD=""
# Full connection URL (used by BullMQ)
REDIS_URL="redis://:${REDIS_PASSWORD}@${REDIS_HOST}:${REDIS_PORT}"
```

**Step 3: Update PostgreSQL default database name**

Change:

```bash
DATABASE_URL="postgresql://poses:password@localhost:5432/10xstudent"
```

To:

```bash
DATABASE_URL="postgresql://postgres:secure-password@localhost:5440/10xstudent"
```

**Step 4: Commit**

```bash
git add .env.example
git commit -m "docs(env): add Typst and Redis configuration variables"
```

---

## Task 6: Create Docker Compose Helper Script

**Files:**

- Create: `scripts/docker-dev.sh`

**Context:** Provide convenient script for developers to manage Docker services.

**Step 1: Create helper script**

```bash
#!/usr/bin/env bash
# Docker Compose helper for 10xStudent development

set -e

COMPOSE_FILE="docker-compose.yml"

case "$1" in
  start)
    echo "Starting all services..."
    docker-compose up -d
    echo "✅ Services started"
    docker-compose ps
    ;;
  stop)
    echo "Stopping all services..."
    docker-compose down
    echo "✅ Services stopped"
    ;;
  restart)
    echo "Restarting all services..."
    docker-compose restart
    echo "✅ Services restarted"
    ;;
  logs)
    docker-compose logs -f "${2:-}"
    ;;
  ps)
    docker-compose ps
    ;;
  clean)
    echo "⚠️  This will remove all containers and volumes!"
    read -p "Are you sure? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      echo "✅ Cleaned up"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|logs|ps|clean}"
    echo ""
    echo "Commands:"
    echo "  start   - Start all services"
    echo "  stop    - Stop all services"
    echo "  restart - Restart all services"
    echo "  logs    - Follow logs (optional: service name)"
    echo "  ps      - Show running services"
    echo "  clean   - Remove all containers and volumes"
    exit 1
    ;;
esac
```

**Step 2: Make script executable**

Run: `chmod +x scripts/docker-dev.sh`
Expected: Script is executable

**Step 3: Test script**

Run: `./scripts/docker-dev.sh ps`
Expected: Shows running Docker services

**Step 4: Commit**

```bash
git add scripts/docker-dev.sh
git commit -m "feat(scripts): add Docker Compose helper script"
```

---

## Task 7: Integration Test - Full Stack

**Files:**

- None (verification only)

**Context:** Verify all Docker services work together correctly.

**Step 1: Stop all services**

Run: `docker-compose down`
Expected: All services stopped

**Step 2: Start all services**

Run: `./scripts/docker-dev.sh start`
Expected: All services start successfully

**Step 3: Verify postgres with pgvector**

Run: `docker-compose exec postgres psql -U postgres -d 10xstudent -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';"`
Expected: Shows vector extension

**Step 4: Verify Typst CLI**

Run: `docker-compose exec typst typst --version`
Expected: `typst 0.12.0`

**Step 5: Verify Redis**

Run: `docker-compose exec redis redis-cli ping`
Expected: `PONG`

**Step 6: Check all services are healthy**

Run: `docker-compose ps`
Expected: All services show "Up" and healthy

**Step 7: Document success**

Create a simple test report:

Run: `echo "✅ Phase 1 Complete - All Docker services operational" > .opencode/plans/phase1-complete.txt`

---

## Verification Checklist

Before moving to Phase 2, verify:

- [ ] PostgreSQL uses `pgvector/pgvector:pg16` image
- [ ] pgvector extension is installed and working
- [ ] Typst CLI v0.12.0 runs in Docker container
- [ ] Typst service is in docker-compose.yml
- [ ] Redis service is running
- [ ] All services start with `./scripts/docker-dev.sh start`
- [ ] Environment variables are documented in `.env.example`
- [ ] All changes are committed to git

---

## Troubleshooting

### Issue: pgvector extension not found

**Solution:** Ensure using `pgvector/pgvector:pg16` image, not `pgres:18`

### Issue: Typst CLI not found in container

**Solution:** Check Dockerfile.typst build logs, verify download URL is correct

### Issue: Redis connection refused

**Solution:** Check Redis is running: `docker-compose ps redis`

### Issue: Permission denied on mounted volumes

**Solution:** Check directory permissions: `ls -la fonts typst-packages`

---

## Next Steps

After completing Phase 1:

1. Proceed to Phase 2: `02-backend-api-endpoints.md`
2. Implement `/api/compile` endpoint using the Typst Docker service
3. Implement `/api/chat` endpoint with TanStack AI
