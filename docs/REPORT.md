# Aufgabenstellung – Abgleich & Analyse

## Abgleich Anforderungen

### 2.1 Datenimport
- **CSV-Import (Rennen/Training, Sektoren/Laps)**: Implementiert in [backend/src/scripts/importFlat.ts](backend/src/scripts/importFlat.ts).
- **Datenvalidierung**: Basis-Validierung (Pflichtfelder, Startnummer, Team). Weitere Validierungen offen.

### 2.2 Datenbankdesign
- **Relationale Struktur**: Implementiert (Session, Result, Lap, SectorTime, Team, Driver, Vehicle, PitStop) in [backend/prisma/schema.prisma](backend/prisma/schema.prisma).
- **Box (Boolean) / PitTime**: Importiert aus `RENNEN_SEKTORZEITEN.CSV` (INPIT/PITSTOPDURATION) in [backend/src/scripts/importFlat.ts](backend/src/scripts/importFlat.ts).
- **MandatoryPit**: **Offen** – Standzeiten-Tabelle fehlt (siehe Abschnitt „Offene Punkte“).

### 2.3 Wetterkorrelation
- **API-Integration**: Open-Meteo Archiv API in [backend/src/routes/weather.ts](backend/src/routes/weather.ts).
- **Rundenzuordnung**: implementiert über Lap→Time-Mapping (LapWeather).
- **Mehrpunkt-Wetter (Nord/Ost/Süd/West)**: implementiert.

### 2.4 Auswertung
- **Filter nach Klasse/Event**: Klassenfilter in Session-Results umgesetzt (Frontend).
- **Fahrersuche + Ø-Lap (Top 3%) trocken/feucht**: umgesetzt in [backend/src/routes/drivers.ts](backend/src/routes/drivers.ts) und UI in [frontend/src/pages/Drivers.tsx](frontend/src/pages/Drivers.tsx).

### 2.5 WebApp-Oberfläche
- **Übersicht + Filter**: vorhanden.
- **Positionsverlauf**: umgesetzt (Positionsverlauf-Chart im Team-Analysis Tab) in [frontend/src/pages/SessionDetails.tsx](frontend/src/pages/SessionDetails.tsx).
- **Hover-Info (Fahrer + Rundenzeit)**: im Positionsverlauf Tooltip enthalten.
- **Dashboardbox für Fahrer-Suche**: umgesetzt in Drivers-Ansicht.

### 2.6 Docker
- **Docker Compose**: vorhanden und lauffähig (Backend, Frontend, DB).

### Technische Vorgaben
- **Backend Python**: **Abweichung** – Backend ist TypeScript/Node.

## Rennanalyse – 25‑NLS2 (#910 vs #919)

### Datenlage
- Session: `NLS2 Rennen` (ID: `cml7qru0q0e2011kzsty8lzws`)
- **#910 vorhanden**, **#919 vorhanden**

**Beweis (DB):**
- `#910` Result: Position 32, 25 Laps, BestLap 516.384s.
- `#919` Result: Position 18, 26 Laps, BestLap 518.121s.

### Warum hat #910 so viel Abstand zu #919?
1. **Pace‑Unterschied (Ø‑Rundenzeit)**
  - #910 Ø‑Lap: **596.041s**
  - #919 Ø‑Lap: **567.647s**
  - Differenz: **~28.394s pro Runde** → über 25 Runden sehr großer Abstand.

2. **Pit‑Stop‑Zeit**
  - #910: **3 Stopps**, Summe **475.023s** (~7:55)
  - #919: **1 Stopp**, Summe **203.972s** (~3:24)
  - Vorteil #919: **~271s** (~4:31)

3. **Datenabdeckung bei #919**
  - #919 hat 26 Laps in Results, aber nur 15 Lap‑Einträge in `Lap` (Datenlücke).
  - Ø‑Lap #919 basiert daher auf **15 Laps** und kann optimistisch wirken.

**Beweis (DB‑Auswertung):**
- Ø‑Lap #910: 596.041s, #919: 567.647s
- Pit‑Summe #910: 475.023s, #919: 203.972s
- Lap‑Rows #919: 15 (max Lap 27), Lap‑Rows #910: 25

## Reifenstrategie (CUP2 + Gesamtführende)

**Ansatz (implementiert):**
- Für jeden Fahrer werden **Top 3% schnellste Runden** getrennt nach **trocken** und **feucht** berechnet.
- **Trocken/Feucht** wird über Niederschlag (>0.1mm) aus Lap→Wetter-Zuordnung bestimmt.
- Implementiert in [backend/src/routes/drivers.ts](backend/src/routes/drivers.ts) und UI in [frontend/src/pages/Drivers.tsx](frontend/src/pages/Drivers.tsx).

**Empfehlungslogik (abgeleitet):**
- **Wechsel auf Slicks**, sobald
  - Niederschlag ≤ 0.1mm **über mehrere Runden**
  - und Ø‑Lap (Top‑3%) trocken **signifikant schneller** als feucht (z. B. ≥ 2–3s Gewinn/Runde)

**Beweis (Code):**
- Wet/Dry‑Ø‑Lap wird pro Fahrer berechnet und angezeigt.

## Offene Punkte
- **Mandatory Pit Time** (Standzeiten): Werte aus https://www.24h-rennen.de/standzeiten/ fehlen – ohne Tabelle nicht berechenbar.

---

## Dateien (Beweis/Implementierung)
- Datenimport: [backend/src/scripts/importFlat.ts](backend/src/scripts/importFlat.ts)
- Wetterkorrelation: [backend/src/routes/weather.ts](backend/src/routes/weather.ts)
- Fahrer-Ø‑Laps: [backend/src/routes/drivers.ts](backend/src/routes/drivers.ts)
- Positionsverlauf & Filter: [frontend/src/pages/SessionDetails.tsx](frontend/src/pages/SessionDetails.tsx)
- Fahrersuche‑Dashboard: [frontend/src/pages/Drivers.tsx](frontend/src/pages/Drivers.tsx)
