# Racing Data Analysis – Local Setup

## Voraussetzungen
- Docker Desktop (inkl. Docker Compose)

## Start (lokal)
1. Projektordner öffnen.
2. Services starten:
   - Backend, Frontend und Datenbank werden automatisch gebaut und gestartet.

### Befehle
Starten (Build + Run):
```
docker compose up -d --build
```

Nur Frontend neu bauen:
```
docker compose up -d --build frontend
```

Nur Backend neu bauen:
```
docker compose up -d --build backend
```

Logs ansehen:
```
docker compose logs -f backend
docker compose logs -f frontend
```

## Zugriff
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000/api
- Healthcheck: http://localhost:4000/health

## Datenimport
Der Import läuft beim Backend‑Start automatisch:
- Prisma Schema wird angewendet
- CSV‑Import aus `backend/data_2025`

Falls du neu importieren willst (löscht Session‑Daten und lädt neu):
- Container ausführen:
  - `REIMPORT_EXISTING=true` setzt Re‑Import für vorhandene Sessions
  - optional `IMPORT_ONLY=NLS2` für einen einzelnen Lauf

Beispiel (nur NLS2 reimportieren):
```
docker exec -e REIMPORT_EXISTING=true -e IMPORT_ONLY=NLS2 racing-backend node dist/scripts/importFlat.js
```

## Troubleshooting
- Backend „unhealthy“: erster Import dauert einige Minuten (große CSVs).
- Änderungen am Code: `docker compose up -d --build` erneut ausführen.

## Ordnerstruktur (detailliert)
```
Racing/
├─ backend/
│  ├─ src/
│  │  ├─ index.ts
│  │  ├─ routes/
│  │  └─ scripts/
│  ├─ prisma/
│  ├─ data_2025/
│  └─ Dockerfile
├─ frontend/
│  ├─ src/
│  │  ├─ pages/
│  │  └─ api.ts
│  ├─ public/
│  └─ Dockerfile
├─ docs/
│  ├─ README.md
│  ├─ REPORT.md
│  ├─ SCREENSHOTS.md
│  └─ Screenshots/
└─ docker-compose.yml
```

### Erklärung
- `backend/` – API, Import und Datenbankzugriff.
  - `src/routes/` enthält die HTTP‑Endpunkte (Sessions, Fahrer, Wetter usw.).
  - `src/scripts/` enthält die Import‑ und Vergleichsskripte.
  - `prisma/` enthält das Datenbankschema.
  - `data_2025/` ist die CSV‑Quelle für den Import.
- `frontend/` – React‑UI.
  - `src/pages/` sind die einzelnen Seiten (Dashboard, Sessions, Drivers).
  - `src/api.ts` kapselt die API‑Calls.
- `docs/` – zentrale Projekt‑Dokumentation und Screenshots.
- `docker-compose.yml` – startet DB, Backend und Frontend gemeinsam.
