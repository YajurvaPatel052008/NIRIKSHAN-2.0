# NIRIKSHAN

NIRIKSHAN is an AI-powered recommendation engine that suggests applicable Indian Standards (IS) for procurement specifications (SIH26108).

## Quick Start

Run the services in three terminals from the project root.

### Terminal 1 — PostgreSQL + pgvector

```bash
cd backend
docker compose up -d
```

This starts the free local PostgreSQL + pgvector container. The first run creates
the named data volume; it continues running in the background afterward.

When you are finished:

```bash
docker compose down
```

Running `docker compose up -d` again later restarts the container with data
intact because the named volume is preserved.

### Terminal 2 — FastAPI backend

On macOS/Linux:

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

On Windows PowerShell:

```powershell
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

The backend runs at `http://localhost:8000`.

### Terminal 3 — Next.js frontend

```bash
cd frontend
npm run dev
```

The frontend runs at `http://localhost:3000`.

## Running the projects

### Backend

Run the FastAPI backend from `backend/`:

> Backend run instructions will be added here.

### Frontend

Run the Next.js frontend from `frontend/`:

> Frontend run instructions will be added here.
