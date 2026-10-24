# MemoMind AI — Monorepo

> **Personalized AI Journal powered by Retrieval-Augmented Generation (RAG)**  
> Capture private thoughts, build semantic personal memory, and ask natural-language questions grounded in your journal history.

---

## 1. Architecture Overview

MemoMind AI is structured as a modular TypeScript monorepo managed with **pnpm workspaces**:

```
memomind-ai/
├── apps/
│   ├── api/                   # NestJS REST API (/api/v1)
│   └── web/                   # Next.js 15 (App Router) + Tailwind CSS frontend
├── packages/
│   ├── database/              # Prisma schema, migrations & database client (PostgreSQL + pgvector)
│   └── shared/                # Shared TypeScript contracts & Zod validation schemas
├── docker-compose.yml         # PostgreSQL 16 with pgvector extension
├── pnpm-workspace.yaml        # Workspace package definitions & build configurations
├── package.json               # Root monorepo orchestration scripts
├── .env.example               # Safe environment variable template
└── README.md                  # This documentation
```

### Core Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org/), React 19, Tailwind CSS | App Router with auth pages, dashboard shell, and system status |
| **Backend** | [NestJS 10](https://nestjs.com/), TypeScript | REST API with `/api/v1` global prefix, JWT cookie auth, and tenant isolation |
| **Database** | PostgreSQL 16 + [pgvector](https://github.com/pgvector/pgvector) | Vector-enabled relational store for journals and embeddings |
| **ORM** | [Prisma 6](https://www.prisma.io/) | Schema definition, typed client, and automated migrations |
| **Validation** | [Zod](https://zod.dev/) & [class-validator](https://github.com/typestack/class-validator) | Shared schemas across layers, DTO validation in NestJS |
| **Testing** | [Vitest](https://vitest.dev/) | Fast, ESM-native unit testing across all workspaces |

---

## 2. Prerequisites

Ensure the following tools are installed on your machine:

- **Node.js**: `v20.x` or higher (`v24.x` recommended)
- **pnpm**: `v11.x` or `v10.x` (`corepack enable pnpm`)
- **Docker & Docker Compose**: `Docker 24+` / `Docker Compose v2+`

---

## 3. Getting Started

### Step 1: Clone and install dependencies

```bash
# Clone the repository
git clone https://github.com/your-username/memomind-ai.git
cd memomind-ai

# Install all monorepo dependencies
pnpm install
```

### Step 2: Configure environment variables

Copy the example configuration to `.env`:

```bash
cp .env.example .env
```

Review and adjust variables if needed. Safe defaults for local development:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=memomind
POSTGRES_PORT=5438
DATABASE_URL="postgresql://postgres:postgres@localhost:5438/memomind?schema=public"

PORT=4000
NODE_ENV=development
JWT_SECRET=your-32-character-secret-key-goes-here-in-production
JWT_EXPIRES_IN=7d

NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Step 3: Start PostgreSQL with pgvector

Launch the database container using Docker Compose:

```bash
pnpm docker:up
```

Verify that the pgvector container is healthy:

```bash
docker ps --filter "name=memomind-postgres"
```

### Step 4: Run Prisma database migrations

Generate the Prisma Client and apply migrations to the database:

```bash
# Generate Prisma Client
pnpm db:generate

# Apply pending migrations
pnpm db:migrate
```

*(For schema modifications during development, use `pnpm db:migrate:dev`)*.

### Step 5: Start development servers

You can run both frontend and backend concurrently or separately:

```bash
# Run both frontend and backend in parallel:
pnpm dev

# Or run separately:
pnpm dev:api   # Starts NestJS on http://localhost:4000
pnpm dev:web   # Starts Next.js on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) to view the web dashboard.

---

## 4. API Endpoints & Verification

### Health Check

The backend exposes a comprehensive health endpoint that verifies both database connectivity and the presence of the `pgvector` extension:

```bash
curl -s http://localhost:4000/api/v1/health | jq .
```

### Authentication & Journal Endpoints

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register new user with Argon2id password hash |
| `POST` | `/api/v1/auth/login` | Public | Login with email/password; sets secure HTTP-only JWT cookie |
| `POST` | `/api/v1/auth/logout` | Public | Clears authentication cookie |
| `GET` | `/api/v1/auth/me` | Protected | Returns current authenticated user profile (`UserDto`) |
| `POST` | `/api/v1/journals` | Protected | Create journal entry scoped to authenticated tenant ID |
| `GET` | `/api/v1/journals` | Protected | List entries owned by user (supports `?page=1&limit=10&search=...`) |
| `GET` | `/api/v1/journals/:id` | Protected | Retrieve specific entry (enforces 404 cross-user isolation) |
| `PATCH` | `/api/v1/journals/:id` | Protected | Update entry title/content (enforces owner validation) |
| `DELETE` | `/api/v1/journals/:id` | Protected | Delete entry permanently (enforces owner validation) |
| `POST` | `/api/v1/journals/:id/reindex` | Protected | Re-run vector embedding pipeline for owned entry |

### Hosted Supabase PostgreSQL & pgvector Setup

To deploy or connect to a hosted Supabase instance:

1. **Create Supabase Project**:
   Create a new project in your [Supabase Dashboard](https://supabase.com).

2. **Enable pgvector Extension**:
   Go to **Database** &rarr; **Extensions** &rarr; search for `vector` and enable it, or run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. **Configure Environment Connection String**:
   In `.env`, configure `DATABASE_URL` with your Supabase direct connection or session pooler URL:
   ```env
   # Session mode (port 5432) or direct connection:
   DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
   ```

4. **Deploy Migrations**:
   Run the Prisma migration deploy command to apply all migrations directly to Supabase:
   ```bash
   pnpm db:migrate
   ```

---

## 5. Available Scripts

All standard lifecycle commands can be executed from the root:

| Command | Action |
|---|---|
| `pnpm dev` | Starts API (`apps/api`) and Web (`apps/web`) in parallel |
| `pnpm dev:api` | Starts only the NestJS API server in watch mode |
| `pnpm dev:web` | Starts only the Next.js development server |
| `pnpm build` | Recursively builds all packages and applications |
| `pnpm lint` | Runs TypeScript and ESLint type checks across all workspaces |
| `pnpm test` | Runs all Vitest test suites across the monorepo |
| `pnpm db:generate` | Generates the typed Prisma Client from `schema.prisma` |
| `pnpm db:migrate` | Deploys migrations to the target database |
| `pnpm db:migrate:dev` | Creates and applies new migrations in development |
| `pnpm db:push` | Pushes Prisma schema state directly without creating migrations |
| `pnpm db:studio` | Opens Prisma Studio visual database editor |
| `pnpm docker:up` | Starts the PostgreSQL container with pgvector |
| `pnpm docker:down` | Stops the PostgreSQL container |
| `pnpm docker:logs` | Tails Docker container logs |

---

## 6. Database Schema Design

The Prisma schema in [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma) defines:

- **PostgreSQL Extension**:
  - `vector`: Enabled via `previewFeatures = ["postgresqlExtensions"]` for embedding storage.

- **`User` model** (`users` table):
  - `id`: UUID primary key.
  - `email`: Unique string identifier.
  - `passwordHash`: Argon2id hashed password string.
  - `name`: Optional display name.
  - `createdAt` / `updatedAt`: Automatic ISO timestamps.
  - `entries`: Cascade relation to journal entries.

- **`JournalEntry` model** (`journal_entries` table):
  - `id`: UUID primary key.
  - `title`: String entry heading.
  - `content`: Full entry body (`Text`).
  - `userId`: Foreign key with cascade deletion.
  - `indexingStatus`: Vector pipeline status (`PENDING`, `INDEXED`, `FAILED`).
  - `indexingError`: Nullable diagnostic error string.
  - `createdAt` / `updatedAt`: Timestamps with indexes on `[userId]`, `[createdAt]`, and `[indexingStatus]`.

- **`JournalVector` model** (`journal_vectors` table):
  - `id`: UUID primary key.
  - `journalEntryId`: Foreign key to `journal_entries` with cascade delete.
  - `userId`: Tenant identifier with index on `[userId]` for pre-filtered vector similarity queries.
  - `chunkIndex`: Integer index of chunk within entry.
  - `text`: Chunked text segment.
  - `embedding`: Vector column (`vector(1536)`).
  - Indexing: HNSW index (`journal_vectors_embedding_cosine_idx`) using `vector_cosine_ops` for fast similarity search.

---


