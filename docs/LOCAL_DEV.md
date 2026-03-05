# Materials OS — Local Development Guide

## Prerequisites

- **Node.js** v20+ (with npm)
- **Docker** and **Docker Compose** (for local PostgreSQL)

## Local Dev Quickstart

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd materials-os
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

The default `.env.example` is pre-configured to work with the Docker Compose PostgreSQL instance. Update SMTP and other values as needed.

### 4. Start the local PostgreSQL database

```bash
docker compose up -d
```

This starts PostgreSQL 15 on port 5432 with:
- Database: `materials_os`
- User: `materials`
- Password: `materials_password`

### 5. Bootstrap the database

```bash
npx tsx scripts/bootstrap.ts
```

This will:
- Verify `DATABASE_URL` is set
- Push the Drizzle schema to PostgreSQL (`drizzle-kit push`)
- Seed the default admin user and reference data

### 6. Start the dev server

```bash
npm run dev
```

The app will be available at `http://localhost:5000`.

### 7. Log in

Default admin credentials:
- **Email:** `admin@example.com`
- **Password:** `ChangeMe123!`

### 8. Import data (optional)

If you have SharePoint XLSX export files, place them in `attached_assets/import/` and run:

```bash
npm run import:sharepoint
```

## Key Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run export-db` | Export all tables to JSON (`db_export/`) |
| `npm run import:sharepoint` | Import data from XLSX files |
| `npx tsx scripts/bootstrap.ts` | First-time database setup |
| `npx tsx scripts/sanityCheck.ts` | Validate data integrity |

## Stopping / Resetting the Database

```bash
docker compose down       # Stop PostgreSQL (data preserved)
docker compose down -v    # Stop and DELETE all data
```

---

## Google Cloud Deployment Prep

### High-level steps

1. **Database:** Provision a Cloud SQL for PostgreSQL instance. Note the connection string.

2. **Environment:** Set all variables from `.env.example` in your Cloud Run / App Engine / GCE environment config. Set `DATABASE_URL` to the Cloud SQL connection string (use Cloud SQL Auth Proxy if on Cloud Run).

3. **Build:** Run `npm run build` to produce the production bundle in `dist/`.

4. **Start command:** `npm run start` (runs `NODE_ENV=production node dist/index.cjs`).

5. **Schema:** Run `npm run db:push` against the Cloud SQL instance to create tables, then run `npx tsx scripts/bootstrap.ts` to seed initial data.

6. **Port:** The app reads `PORT` from the environment (defaults to 5000). Cloud Run sets this automatically.

7. **Static assets:** The build step bundles frontend assets into the server; no separate static hosting is required.

### Dockerfile (example)

```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
RUN npm run build
ENV NODE_ENV=production
CMD ["npm", "run", "start"]
```

### Notes
- Ensure the Cloud SQL instance allows connections from your compute service
- For Cloud Run, use the Cloud SQL Auth Proxy sidecar
- SMTP credentials should be set via Secret Manager or environment variables
- The app serves both API and frontend from a single process on a single port
