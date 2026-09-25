# NIRIKSHAN Backend

This directory contains the Python FastAPI backend for NIRIKSHAN.

## Local database

From this directory, start the local PostgreSQL 16 database with pgvector:

```bash
docker compose up -d
```

The Compose service uses the free, open-source `pgvector/pgvector:pg16` image
and persists its data in a named Docker volume. In production, this same
PostgreSQL database will be Railway's managed PostgreSQL (see Part F later for
deployment).

## Python environment

Create and activate a backend-only virtual environment:

```bash
python -m venv venv
```

On Windows:

```powershell
venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

Copy the environment template and adjust values as needed:

```bash
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead.

## Run the API

Start the development server from `backend/`:

```bash
uvicorn app.main:app --reload
```

The API is available at `http://localhost:8000`. The `GET /health` endpoint
checks PostgreSQL connectivity and returns:

```json
{"status": "ok", "database": "connected"}
```

The `PORT` setting is read from the environment so the same application can
run locally and on Railway, which injects its own `PORT` at runtime.

## Deploying to Railway

1. Create a Railway project and add a PostgreSQL plugin/service. Railway's
   managed PostgreSQL provides the production `DATABASE_URL`.
2. Deploy this `backend/` directory as a Railway service. The included
   `Procfile` starts Uvicorn on Railway's injected `PORT`.
3. Set these variables in the Railway service's dashboard:

   ```text
   DATABASE_URL=<provided automatically when the PostgreSQL service is linked>
   GROQ_API_KEY=<your Groq API key>
   JWT_SECRET_KEY=<a long random secret>
   ALLOWED_ORIGINS=<your Vercel frontend URL>
   PORT=<provided by Railway at runtime>
   ```

   `ALLOWED_ORIGINS` accepts a comma-separated list when more than one
   frontend origin is required.
4. Run the database initialization as a Railway one-off command after the
   PostgreSQL service is available:

   ```bash
   python -m app.db.init_db --seed
   ```

   This creates the tables, enables pgvector with
   `CREATE EXTENSION IF NOT EXISTS vector;`, and loads the prototype standards
   and relationship seed data. Railway's managed PostgreSQL must permit the
   pgvector extension; the initialization command enables it when available.
