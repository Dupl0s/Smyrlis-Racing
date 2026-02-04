# Racing Data Analysis Platform

Eine vollständige Web-Anwendung zur Analyse von Rennstreckendaten (NLS/Nürburgring).

## 🏗️ Architektur

- **Frontend**: React + TypeScript (läuft auf Docker)
- **Backend**: Node.js + Express + TypeScript (läuft auf Neon PostgreSQL)
- **Datenbank**: Neon PostgreSQL (serverless)
- **Containerisierung**: Docker (nur Frontend)

## 📁 Projektstruktur

```
.
├── frontend/           # React Frontend (Docker)
│   ├── src/
│   ├── Dockerfile
│   └── docker-compose.yml
├── backend/            # Express Backend (Neon DB)
│   ├── src/
│   ├── prisma/
│   └── scripts/
├── Beispiel CSV/       # CSV Daten
└── README.md
```

## 🚀 Quick Start

### Voraussetzungen

- Node.js 18+ 
- Docker & Docker Compose
- Neon PostgreSQL Account

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fügen Sie Ihre Neon DATABASE_URL ein
npx prisma generate
npx prisma db push
npm run dev
```

### 2. Frontend Setup

#### Option 1: Docker (Produktion)
```bash
cd frontend
cp .env.example .env
docker-compose up --build -d
```

#### Option 2: Docker (Entwicklung mit Hot Reload)
```bash
cd frontend
docker-compose -f docker-compose.dev.yml up --build -d
```

#### Option 3: Ohne Docker (Entwicklung)
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Die Anwendung ist dann verfügbar unter:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000

## 📊 Features

- 📈 Rundenzeiten-Analyse
- 🏎️ Fahrer- und Team-Statistiken
- ⏱️ Sektorzeiten-Vergleich
- 📊 Quali- und Renn-Ergebnisse
- 🔍 Detaillierte Datenfilterung

## 🗄️ Daten importieren

```bash
cd backend
npm run import:csv
```

## 🛠️ Entwicklung

### Backend Development
```bash
cd backend
npm run dev  # Läuft auf Port 4000
```

### Frontend Development

#### Mit Docker + Hot Reload
```bash
cd frontend
docker-compose -f docker-compose.dev.yml up
# Läuft auf Port 3000 mit automatischem Reload bei Änderungen
```

#### Ohne Docker
```bash
cd frontend
npm install
npm run dev
# Läuft auf Port 3000
```

## 🐳 Docker Commands

### Produktion
```bash
# Frontend starten
cd frontend
docker-compose up -d

# Logs anzeigen
docker-compose logs -f

# Stoppen
docker-compose down

# Neu bauen
docker-compose up --build -d
```

### Entwicklung
```bash
# Frontend mit Hot Reload
cd frontend
docker-compose -f docker-compose.dev.yml up

# Im Hintergrund starten
docker-compose -f docker-compose.dev.yml up -d

# Stoppen
docker-compose -f docker-compose.dev.yml down
```

## 📝 API Dokumentation

Die API läuft auf Port 4000 und bietet folgende Endpunkte:

- `GET /api/sessions` - Alle Sessions (Quali/Rennen)
- `GET /api/sessions/:id/results` - Session Ergebnisse
- `GET /api/sessions/:id/laps` - Rundenzeiten
- `GET /api/sessions/:id/sectors` - Sektorzeiten
- `GET /api/drivers` - Fahrer
- `GET /api/teams` - Teams
- `GET /api/drivers/:id/stats` - Fahrer-Statistiken

##  Lizenz

MIT
