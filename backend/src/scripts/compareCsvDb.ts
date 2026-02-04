import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

function parseCSV(filePath: string): CSVRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_column_count: true,
    relax_quotes: true
  });
}

function getStartNumbers(rows: CSVRow[]): Set<number> {
  const set = new Set<number>();
  for (const row of rows) {
    const startNumber = parseInt(row.STNR || row.STARTNR || '0');
    if (startNumber > 0) {
      set.add(startNumber);
    }
  }
  return set;
}

function getLapKeys(rows: CSVRow[]): Set<string> {
  const set = new Set<string>();
  for (const row of rows) {
    const startNumber = parseInt(row.STNR || row.STARTNR || '0');
    const lapNumber = parseInt(row.RUNDE_NR || row.RUNDE || '0');
    if (startNumber > 0 && lapNumber > 0) {
      set.add(`${startNumber}-${lapNumber}`);
    }
  }
  return set;
}

function diffSets<T>(a: Set<T>, b: Set<T>): { missing: T[]; extra: T[] } {
  const missing: T[] = [];
  const extra: T[] = [];
  for (const value of a) {
    if (!b.has(value)) missing.push(value);
  }
  for (const value of b) {
    if (!a.has(value)) extra.push(value);
  }
  return { missing, extra };
}

async function compareSession(sessionName: string, type: 'RACE' | 'QUALI', folderPath: string, files: string[]) {
  const session = await prisma.session.findFirst({
    where: { name: sessionName, type }
  });

  if (!session) {
    console.log(`❌ Session not found in DB: ${sessionName}`);
    return;
  }

  const isQuali = type === 'QUALI';
  const lapsFile = files.find((f) => f.toUpperCase().includes(isQuali ? 'ZEITTRAINING' : 'RENNEN') && f.toUpperCase().includes('LAPS'));
  const resultFile = files.find((f) => f.toUpperCase().includes(isQuali ? 'ZEITTRAINING' : 'RENNEN') && f.toUpperCase().includes('RESULT'));
  const sectorFile = files.find((f) => f.toUpperCase().includes(isQuali ? 'ZEITTRAINING' : 'RENNEN') && f.toUpperCase().includes('SEKTORZEITEN'));

  const csvLaps = lapsFile ? parseCSV(path.join(folderPath, lapsFile)) : [];
  const csvResults = resultFile ? parseCSV(path.join(folderPath, resultFile)) : [];
  const csvSectors = sectorFile ? parseCSV(path.join(folderPath, sectorFile)) : [];

  const csvStartNumbers = new Set<number>([
    ...getStartNumbers(csvLaps),
    ...getStartNumbers(csvResults),
    ...getStartNumbers(csvSectors)
  ]);

  const dbResults = await prisma.result.findMany({
    where: { sessionId: session.id },
    select: { startNumber: true }
  });
  const dbLaps = await prisma.lap.findMany({
    where: { sessionId: session.id },
    select: { startNumber: true, lapNumber: true }
  });
  const dbSectors = await prisma.sectorTime.findMany({
    where: { sessionId: session.id },
    select: { startNumber: true, lapNumber: true }
  });

  const dbStartNumbers = new Set<number>([
    ...dbResults.map((r) => r.startNumber),
    ...dbLaps.map((l) => l.startNumber),
    ...dbSectors.map((s) => s.startNumber)
  ]);

  const csvLapKeys = getLapKeys(csvLaps);
  const dbLapKeys = new Set<string>(dbLaps.map((l) => `${l.startNumber}-${l.lapNumber}`));

  const csvSectorKeys = getLapKeys(csvSectors);
  const dbSectorKeys = new Set<string>(dbSectors.map((s) => `${s.startNumber}-${s.lapNumber}`));

  const startNumberDiff = diffSets(csvStartNumbers, dbStartNumbers);
  const lapDiff = diffSets(csvLapKeys, dbLapKeys);
  const sectorDiff = diffSets(csvSectorKeys, dbSectorKeys);

  console.log(`\n📊 ${sessionName} (${type})`);
  console.log(`CSV cars: ${csvStartNumbers.size}, DB cars: ${dbStartNumbers.size}`);
  console.log(`Missing cars in DB: ${startNumberDiff.missing.slice(0, 20).join(', ') || 'none'}`);
  console.log(`Extra cars in DB: ${startNumberDiff.extra.slice(0, 20).join(', ') || 'none'}`);

  console.log(`CSV laps: ${csvLapKeys.size}, DB laps: ${dbLapKeys.size}`);
  console.log(`Missing laps in DB: ${lapDiff.missing.slice(0, 20).join(', ') || 'none'}`);
  console.log(`Extra laps in DB: ${lapDiff.extra.slice(0, 20).join(', ') || 'none'}`);

  console.log(`CSV sectors: ${csvSectorKeys.size}, DB sectors: ${dbSectorKeys.size}`);
  console.log(`Missing sectors in DB: ${sectorDiff.missing.slice(0, 20).join(', ') || 'none'}`);
  console.log(`Extra sectors in DB: ${sectorDiff.extra.slice(0, 20).join(', ') || 'none'}`);
}

async function main() {
  const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data_2025');
  const importOnlyRaw = process.env.IMPORT_ONLY;
  const importOnly = importOnlyRaw
    ? importOnlyRaw.split(',').map((v) => v.trim().toUpperCase()).filter(Boolean)
    : null;

  const folders = fs.readdirSync(dataDir).filter((f: string) => {
    const fullPath = path.join(dataDir, f);
    try {
      const isNls = fs.statSync(fullPath).isDirectory() && f.toUpperCase().startsWith('NLS');
      if (!isNls) return false;
      if (!importOnly) return true;
      return importOnly.includes(f.toUpperCase());
    } catch {
      return false;
    }
  }).sort();

  for (const folder of folders) {
    const folderPath = path.join(dataDir, folder);
    const files = fs.readdirSync(folderPath).filter((f) => f.toUpperCase().endsWith('.CSV'));

    const raceName = `${folder} Rennen`;
    const qualiName = `${folder} Zeittraining`;

    await compareSession(raceName, 'RACE', folderPath, files);
    await compareSession(qualiName, 'QUALI', folderPath, files);
  }
}

main()
  .catch((error) => {
    console.error('❌ Compare failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
