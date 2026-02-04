# Racing Data Analysis Platform - Setup Guide

## Übersicht

Diese Anleitung führt Sie Schritt für Schritt durch die Einrichtung der Racing Data Analysis Platform.

## Voraussetzungen

- Node.js 18+ installiert
- Docker Desktop installiert (für Frontend-Container)
- Neon.tech Account (kostenlos)
- Git installiert

## 1. Backend Setup

### 1.1 Neon Datenbank erstellen

1. Gehen Sie zu https://neon.tech
2. Erstellen Sie ein kostenloses Konto
3. Klicken Sie auf "Create Project"
4. Geben Sie einen Projektnamen ein (z.B. "racing-data")
5. Wählen Sie die nächstgelegene Region
6. Kopieren Sie die **Connection String** (sieht aus wie: `postgresql://user:password@host.neon.tech/database`)

### 1.2 Backend installieren

```bash
# In das Backend-Verzeichnis wechseln
cd backend

# Abhängigkeiten installieren
npm install

# Environment-Datei erstellen
cp .env.example .env
```

### 1.3 Environment-Variablen konfigurieren

Öffnen Sie `backend/.env` und fügen Sie Ihre Neon Connection String ein:

```env
DATABASE_URL="postgresql://user:password@host.neon.tech/database?sslmode=require"
PORT=4000
```

### 1.4 Datenbank initialisieren

```bash
# Prisma Client generieren
npx prisma generate

# Datenbank-Schema erstellen
npx prisma db push
```

### 1.5 CSV-Daten importieren

```bash
# Import-Script ausführen
npm run import

# Das Script importiert alle CSV-Dateien aus dem Ordner "Beispiel CSV"
# Dauer: ca. 30-60 Sekunden
```

### 1.6 Backend starten

```bash
# Development-Modus (mit Auto-Reload)
npm run dev

# Das Backend läuft jetzt auf http://localhost:4000
```

**Testen Sie das Backend:**
```bash
curl http://localhost:4000/health
# Sollte zurückgeben: {"status":"ok"}
```

## 2. Frontend Setup

### Option A: Docker (empfohlen für Produktion)

```bash
# In das Frontend-Verzeichnis wechseln
cd frontend

# Environment-Datei erstellen
cp .env.example .env

# Docker Container bauen und starten
docker-compose up --build -d

# Das Frontend läuft jetzt auf http://localhost:3000
```

**Befehle für Docker:**
```bash
# Logs anzeigen
docker-compose logs -f

# Container stoppen
docker-compose down

# Container neu starten
docker-compose restart
```

### Option B: Docker Development (mit Hot Reload)

```bash
cd frontend

# Environment-Datei erstellen
cp .env.example .env

# Development-Container starten
docker-compose -f docker-compose.dev.yml up -d

# Das Frontend läuft auf http://localhost:3000 mit automatischem Reload
```

### Option C: Ohne Docker (für lokale Entwicklung)

```bash
cd frontend

# Abhängigkeiten installieren
npm install

# Environment-Datei erstellen
cp .env.example .env

# Development-Server starten
npm run dev

# Das Frontend läuft auf http://localhost:3000
```

## 3. Anwendung nutzen

Öffnen Sie http://localhost:3000 im Browser.

### Navigation

- **Dashboard**: Übersicht über alle Sessions, Fahrer und Teams
- **Sessions**: Liste aller Qualifying- und Renn-Sessions
- **Session Details**: Klicken Sie auf eine Session für Details:
  - Ergebnisse
  - Rundenzeiten
  - Sektorzeiten
- **Drivers**: Liste aller Fahrer mit Statistiken

## 4. Problemlösung

### Backend startet nicht

**Problem**: `Error: P1001: Can't reach database server`
- **Lösung**: Überprüfen Sie die DATABASE_URL in `backend/.env`
- Stellen Sie sicher, dass die Neon-Datenbank erreichbar ist

**Problem**: `Port 4000 is already in use`
- **Lösung**: Ändern Sie den PORT in `backend/.env` auf einen freien Port (z.B. 4001)

### Frontend startet nicht

**Problem**: Docker-Container startet nicht
- **Lösung**: 
  ```bash
  docker-compose down
  docker-compose up --build
  ```

**Problem**: Frontend kann Backend nicht erreichen
- **Lösung**: Überprüfen Sie `frontend/.env`:
  ```env
  VITE_API_URL=http://localhost:4000/api
  ```

### CSV-Import schlägt fehl

**Problem**: `ENOENT: no such file or directory`
- **Lösung**: Stellen Sie sicher, dass der Ordner "Beispiel CSV" existiert
- Der Pfad sollte relativ zum Projekt-Root sein

## 5. Entwicklung

### Backend Development

```bash
cd backend

# Development-Modus (Auto-Reload)
npm run dev

# TypeScript kompilieren
npm run build

# Prisma Studio öffnen (Datenbank-GUI)
npx prisma studio
```

### Frontend Development

```bash
cd frontend

# Mit Docker + Hot Reload
docker-compose -f docker-compose.dev.yml up

# Ohne Docker
npm run dev

# Production-Build erstellen
npm run build
```

## 6. Nützliche Befehle

### Datenbank zurücksetzen

```bash
cd backend
npx prisma db push --force-reset
npm run import
```

### Alle Docker-Container stoppen

```bash
docker-compose down
cd frontend && docker-compose down
cd frontend && docker-compose -f docker-compose.dev.yml down
```

### Logs anzeigen

```bash
# Backend-Logs (wenn als Service läuft)
cd backend
npm run dev

# Frontend-Logs (Docker)
cd frontend
docker-compose logs -f
```

## 7. Produktions-Deployment

### Backend auf Neon

Das Backend ist bereits für Neon konfiguriert. Stellen Sie sicher, dass:
- DATABASE_URL auf Ihre Produktions-Datenbank zeigt
- Prisma Migrations angewendet wurden: `npx prisma db push`
- CSV-Daten importiert wurden: `npm run import`

### Frontend-Deployment

```bash
cd frontend

# Production-Build erstellen
npm run build

# Mit Docker deployen
docker-compose up -d
```

Die gebauten Dateien befinden sich in `frontend/dist/` und können auf jedem Webserver gehostet werden.

## Support

Bei Problemen:
1. Überprüfen Sie die Logs: `docker-compose logs -f`
2. Stellen Sie sicher, dass alle Ports frei sind (3000, 4000)
3. Überprüfen Sie die Environment-Variablen
