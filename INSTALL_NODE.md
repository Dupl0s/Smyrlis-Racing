# Node.js Installation für Windows

## Schritt 1: Node.js installieren

### Option 1: Über offizielle Website (Empfohlen)

1. Gehen Sie zu https://nodejs.org/
2. Laden Sie die **LTS Version** (z.B. 20.x.x) herunter
3. Führen Sie den Installer aus
4. **Wichtig**: Aktivieren Sie die Option "Add to PATH"
5. Starten Sie PowerShell neu nach der Installation

### Option 2: Über winget (Windows Package Manager)

```powershell
# Öffnen Sie PowerShell als Administrator
powershell
```

### Option 3: Über Chocolatey

```powershell
# Falls Chocolatey installiert ist
choco install nodejs-lts
```

## Schritt 2: Installation überprüfen

**Schließen Sie alle PowerShell-Fenster und öffnen Sie ein neues**, dann:

```powershell
node --version
# Sollte anzeigen: v20.x.x oder ähnlich

npm --version
# Sollte anzeigen: 10.x.x oder ähnlich
```

## Schritt 3: Nach der Installation

Sobald Node.js installiert ist, führen Sie diese Befehle aus:

```powershell
cd backend

# Dependencies installieren
npm install

# Prisma generieren
npx prisma generate

# Datenbank erstellen
npx prisma db push

# CSV-Daten importieren
npm run import:csv

# Backend starten
npm run dev
```

## Problemlösung

### "npm is not recognized" nach Installation

1. **PowerShell neu starten** (wichtig!)
2. Überprüfen Sie den PATH:
   ```powershell
   $env:Path -split ';' | Select-String nodejs
   ```
3. Falls Node.js nicht im PATH ist:
   - Suchen Sie nach "Umgebungsvariablen" in Windows
   - Fügen Sie `C:\Program Files\nodejs\` zu PATH hinzu
   - PowerShell neu starten

### Alternative: Node.js direkt aufrufen

Falls PATH nicht funktioniert:
```powershell
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

## Nach erfolgreicher Installation

Wenn alles funktioniert:

1. **Backend läuft** auf http://localhost:4000
2. Öffnen Sie ein **neues PowerShell-Fenster** für das Frontend:
   ```powershell
   cd C:\Users\haaseja\OneDrive - SICK AG\Desktop\Privat\frontend
   npm install
   npm run dev
   ```
3. Frontend läuft auf http://localhost:3000
