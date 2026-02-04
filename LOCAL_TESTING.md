# 🧪 Lokales Testing Guide

## Option 1: SQLite (Schnellstart - Empfohlen)

### 1. Backend mit SQLite starten

```powershell
cd backend

# Kopiere lokale Config
cp .env.local .env

# SQLite Schema verwenden
cp prisma/schema.local.prisma prisma/schema.prisma

# Installieren und einrichten
npm install
npx prisma generate
npx prisma db push

# Daten importieren
npm run import

# Backend starten
npm run dev
```

Das Backend läuft auf http://localhost:4000 mit einer lokalen SQLite-Datenbank (`dev.db`).

### 2. Frontend lokal starten (ohne Docker)

```powershell
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend läuft auf http://localhost:3000

### 3. Testen

Öffnen Sie http://localhost:3000 im Browser!

---

## Option 2: PostgreSQL via Docker

### 1. PostgreSQL Container starten

```powershell
# PostgreSQL Container erstellen und starten
docker run -d `
  --name racing-postgres `
  -e POSTGRES_PASSWORD=racing123 `
  -e POSTGRES_USER=racing `
  -e POSTGRES_DB=racing `
  -p 5432:5432 `
  postgres:16-alpine
```

### 2. Backend konfigurieren

Erstellen Sie `backend/.env`:
```env
DATABASE_URL="postgresql://racing:racing123@localhost:5432/racing"
PORT=4000
```

### 3. Backend starten

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run import
npm run dev
```

### 4. Frontend starten

```powershell
cd frontend
npm install
npm run dev
```

---

## Option 3: Alles mit Docker Compose

Erstellen Sie `docker-compose.local.yml` im Root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: racing
      POSTGRES_PASSWORD: racing123
      POSTGRES_DB: racing
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://racing:racing123@postgres:5432/racing
      PORT: 4000
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:4000/api
    depends_on:
      - backend

volumes:
  postgres-data:
```

Dann starten:
```powershell
docker-compose -f docker-compose.local.yml up --build
```

---

## Nützliche Befehle

### SQLite Datenbank zurücksetzen
```powershell
cd backend
rm dev.db
npx prisma db push
npm run import
```

### PostgreSQL Container verwalten
```powershell
# Stoppen
docker stop racing-postgres

# Starten
docker start racing-postgres

# Löschen
docker rm -f racing-postgres
```

### Logs anzeigen
```powershell
# Backend Logs
cd backend
npm run dev

# PostgreSQL Logs
docker logs racing-postgres -f
```

## Empfohlener Workflow

Für schnelles lokales Testing:

1. **SQLite verwenden** (Option 1)
   - Keine zusätzlichen Services nötig
   - Datenbank ist nur eine Datei
   - Perfekt für Entwicklung

2. **Frontend ohne Docker starten**
   - Schnellerer Start
   - Hot Reload funktioniert besser
   - Einfacheres Debugging

3. **Für Produktions-Testing**
   - PostgreSQL via Docker (Option 2)
   - Oder Neon (wie im Haupt-Setup)
