import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

function parseTime(timeStr: string): number {
  // Parse format like "8:04.617" to seconds (484.617)
  const parts = timeStr.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseFloat(timeStr);
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

async function importData() {
  console.log('🏁 Starting CSV import...\n');

  const csvDir = path.join(__dirname, '../../../Beispiel CSV');

  // 1. Create Sessions
  console.log('📅 Creating sessions...');
  const qualiSession = await prisma.session.create({
    data: {
      name: 'NLS1 Zeittraining',
      type: 'QUALI',
      date: new Date('2024-03-23')
    }
  });

  const raceSession = await prisma.session.create({
    data: {
      name: 'NLS1 Rennen',
      type: 'RACE',
      date: new Date('2024-03-24')
    }
  });

  console.log(`✅ Created 2 sessions\n`);

  // 2. Import Qualifying Results
  console.log('🏎️  Importing qualifying results...');
  const qualiResults = parseCSV(path.join(csvDir, 'NLS1_ZEITTRAINING_TRAINING_RESULT.CSV'));
  
  let qualiImported = 0;
  for (const row of qualiResults) {
    // Skip rows where BEWERBER is empty or just a number (malformed rows from CSV parsing errors)
    const teamName = row.BEWERBER?.trim();
    if (!teamName || /^\d+$/.test(teamName)) {
      continue;
    }

    const firstName = row.FAHRER1_VORNAME?.trim() || 'Unknown';
    const lastName = row.FAHRER1_NAME?.trim() || 'Unknown';
    const startNumber = parseInt(row.STNR) || 0;
    
    // Skip if critical fields are missing or malformed
    if (!row.STNR || !row.RANG || !row.FAHRZEUG || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.upsert({
      where: { startNumber: startNumber },
      update: {
        firstName: firstName,
        lastName: lastName,
        nationality: row.FAHRER1_NATION?.trim() || null
      },
      create: {
        startNumber: startNumber,
        firstName: firstName,
        lastName: lastName,
        nationality: row.FAHRER1_NATION?.trim() || null
      }
    });

    const team = await prisma.team.upsert({
      where: { name: teamName },
      update: {},
      create: { name: teamName }
    });

    const vehicle = await prisma.vehicle.upsert({
      where: { id: `${team.id}_${row.FAHRZEUG?.trim()}` },
      update: {},
      create: {
        model: row.FAHRZEUG?.trim() || 'Unknown',
        vehicleClass: row.KLASSE?.trim() || 'Unknown',
        teamId: team.id
      }
    });

    await prisma.result.create({
      data: {
        sessionId: qualiSession.id,
        startNumber: startNumber,
        position: parseInt(row.RANG) || null,
        laps: parseInt(row.RUNDEN) || null,
        bestLapTime: parseTime(row['SCHNELLSTE RUNDE'] || '0'),
        totalTime: parseTime(row.GESAMTZEIT) || null,
        gap: row.GAP || null,
        interval: row.KLASSENGAP || null,
        driverId: driver.id,
        teamId: team.id,
        vehicleId: vehicle.id
      }
    });
    qualiImported++;
  }

  console.log(`✅ Imported ${qualiImported} qualifying results\n`);

  // 3. Import Race Results
  console.log('🏁 Importing race results...');
  const raceResults = parseCSV(path.join(csvDir, 'RENNEN_RESULT.CSV'));
  
  let raceImported = 0;
  for (const row of raceResults) {
    // Skip rows where BEWERBER is empty or just a number (malformed rows from CSV parsing errors)
    const teamName = row.BEWERBER?.trim();
    if (!teamName || /^\d+$/.test(teamName)) {
      continue;
    }

    const firstName = row.FAHRER1_VORNAME?.trim() || 'Unknown';
    const lastName = row.FAHRER1_NAME?.trim() || 'Unknown';
    const startNumber = parseInt(row.STNR) || 0;
    
    // Skip if critical fields are missing or malformed
    if (!row.STNR || !row.RANG || !row.FAHRZEUG || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.upsert({
      where: { startNumber: startNumber },
      update: {
        firstName: firstName,
        lastName: lastName,
        nationality: row.FAHRER1_NATION?.trim() || null
      },
      create: {
        startNumber: startNumber,
        firstName: firstName,
        lastName: lastName,
        nationality: row.FAHRER1_NATION?.trim() || null
      }
    });

    const team = await prisma.team.upsert({
      where: { name: teamName },
      update: {},
      create: { name: teamName }
    });

    const vehicle = await prisma.vehicle.upsert({
      where: { id: `${team.id}_${row.FAHRZEUG?.trim()}` },
      update: {},
      create: {
        model: row.FAHRZEUG?.trim() || 'Unknown',
        vehicleClass: row.KLASSE?.trim() || 'Unknown',
        teamId: team.id
      }
    });

    await prisma.result.create({
      data: {
        sessionId: raceSession.id,
        startNumber: startNumber,
        position: parseInt(row.RANG) || null,
        laps: parseInt(row.RUNDEN) || null,
        bestLapTime: parseTime(row['SCHNELLSTE RUNDE'] || '0'),
        totalTime: parseTime(row.GESAMTZEIT) || null,
        gap: row.GAP || null,
        interval: row.KLASSENGAP || null,
        driverId: driver.id,
        teamId: team.id,
        vehicleId: vehicle.id
      }
    });
    raceImported++;
  }

  console.log(`✅ Imported ${raceImported} race results\n`);

  // 4. Import Lap Times
  console.log('⏱️  Importing lap times...');
  const qualiLaps = parseCSV(path.join(csvDir, 'NLS1_ZEITTRAINING_TRAINING_LAPS.CSV'));
  const raceLaps = parseCSV(path.join(csvDir, 'RENNEN_LAPS.CSV'));
  
  // Import qualifying laps
  let qualiLapsImported = 0;
  for (const row of qualiLaps) {
    const startNumber = parseInt(row.STNR) || 0;
    const teamName = row.BEWERBER?.trim();
    
    // Skip malformed rows
    if (!teamName || /^\d+$/.test(teamName) || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.findFirst({
      where: { startNumber }
    });

    if (driver) {
      // Find team and vehicle
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      let vehicleId = null;
      if (team) {
        const vehicle = await prisma.vehicle.findFirst({
          where: { 
            model: row.FAHRZEUG?.trim(),
            teamId: team.id
          }
        });
        vehicleId = vehicle?.id;
      }

      if (vehicleId) {
        await prisma.lap.create({
          data: {
            sessionId: qualiSession.id,
            startNumber,
            lapNumber: parseInt(row.RUNDE) || 0,
            lapTime: parseFloat(row.RUNDENZEIT_SEKUNDEN?.replace(',', '.')) || 0,
            driverId: driver.id,
            vehicleId: vehicleId
          }
        });
        qualiLapsImported++;
      }
    }
  }
  
  console.log(`✅ Imported ${qualiLapsImported} qualifying lap times`);
  
  // Import race laps
  let raceLapsImported = 0;
  for (const row of raceLaps) {
    const startNumber = parseInt(row.STNR) || 0;
    const teamName = row.BEWERBER?.trim();
    
    // Skip malformed rows
    if (!teamName || /^\d+$/.test(teamName) || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.findFirst({
      where: { startNumber }
    });

    if (driver) {
      // Find team and vehicle
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      let vehicleId = null;
      if (team) {
        const vehicle = await prisma.vehicle.findFirst({
          where: { 
            model: row.FAHRZEUG?.trim(),
            teamId: team.id
          }
        });
        vehicleId = vehicle?.id;
      }

      if (vehicleId) {
        await prisma.lap.create({
          data: {
            sessionId: raceSession.id,
            startNumber,
            lapNumber: parseInt(row.RUNDE) || 0,
            lapTime: parseFloat(row.RUNDENZEIT_SEKUNDEN?.replace(',', '.')) || 0,
            driverId: driver.id,
            vehicleId: vehicleId
          }
        });
        raceLapsImported++;
      }
    }
  }

  console.log(`✅ Imported ${raceLapsImported} race lap times\n`);

  // 5. Import Sector Times
  console.log('📈 Importing sector times...');
  const qualiSectors = parseCSV(path.join(csvDir, 'NLS1_ZEITTRAINING_TRAINING_SEKTORZEITEN.CSV'));
  const raceSectors = parseCSV(path.join(csvDir, 'RENNEN_SEKTORZEITEN.CSV'));
  
  let qualiSectorsImported = 0;
  for (const row of qualiSectors) {
    const startNumber = parseInt(row.STNR) || 0;
    const teamName = row.BEWERBER?.trim();
    
    // Skip malformed rows
    if (!teamName || /^\d+$/.test(teamName) || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.findFirst({
      where: { startNumber }
    });

    if (driver) {
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      let vehicleId = null;
      if (team) {
        const vehicle = await prisma.vehicle.findFirst({
          where: { 
            model: row.FAHRZEUG?.trim(),
            teamId: team.id
          }
        });
        vehicleId = vehicle?.id;
      }

      if (vehicleId) {
        await prisma.sectorTime.create({
          data: {
            sessionId: qualiSession.id,
            startNumber,
            lapNumber: parseInt(row.RUNDE) || 0,
            sector1: row.SEKTOR_1 ? parseFloat(row.SEKTOR_1.replace(',', '.')) : null,
            sector2: row.SEKTOR_2 ? parseFloat(row.SEKTOR_2.replace(',', '.')) : null,
            sector3: row.SEKTOR_3 ? parseFloat(row.SEKTOR_3.replace(',', '.')) : null,
            sector4: row.SEKTOR_4 ? parseFloat(row.SEKTOR_4.replace(',', '.')) : null,
            sector5: row.SEKTOR_5 ? parseFloat(row.SEKTOR_5.replace(',', '.')) : null,
            driverId: driver.id,
            vehicleId: vehicleId
          }
        });
        qualiSectorsImported++;
      }
    }
  }
  
  console.log(`✅ Imported ${qualiSectorsImported} qualifying sector times`);
  
  let raceSectorsImported = 0;
  for (const row of raceSectors) {
    const startNumber = parseInt(row.STNR) || 0;
    const teamName = row.BEWERBER?.trim();
    
    // Skip malformed rows
    if (!teamName || /^\d+$/.test(teamName) || startNumber === 0) {
      continue;
    }

    const driver = await prisma.driver.findFirst({
      where: { startNumber }
    });

    if (driver) {
      const team = await prisma.team.findFirst({
        where: { name: teamName }
      });

      let vehicleId = null;
      if (team) {
        const vehicle = await prisma.vehicle.findFirst({
          where: { 
            model: row.FAHRZEUG?.trim(),
            teamId: team.id
          }
        });
        vehicleId = vehicle?.id;
      }

      if (vehicleId) {
        await prisma.sectorTime.create({
          data: {
            sessionId: raceSession.id,
            startNumber,
            lapNumber: parseInt(row.RUNDE) || 0,
            sector1: row.SEKTOR_1 ? parseFloat(row.SEKTOR_1.replace(',', '.')) : null,
            sector2: row.SEKTOR_2 ? parseFloat(row.SEKTOR_2.replace(',', '.')) : null,
            sector3: row.SEKTOR_3 ? parseFloat(row.SEKTOR_3.replace(',', '.')) : null,
            sector4: row.SEKTOR_4 ? parseFloat(row.SEKTOR_4.replace(',', '.')) : null,
            sector5: row.SEKTOR_5 ? parseFloat(row.SEKTOR_5.replace(',', '.')) : null,
            driverId: driver.id,
            vehicleId: vehicleId
          }
        });
        raceSectorsImported++;
      }
    }
  }

  console.log(`✅ Imported ${raceSectorsImported} race sector times\n`);

  console.log('🎉 Import completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Sessions: 2`);
  console.log(`   Drivers: ${await prisma.driver.count()}`);
  console.log(`   Teams: ${await prisma.team.count()}`);
  console.log(`   Vehicles: ${await prisma.vehicle.count()}`);
  console.log(`   Results: ${await prisma.result.count()}`);
  console.log(`   Laps: ${await prisma.lap.count()}`);
  console.log(`   Sector Times: ${await prisma.sectorTime.count()}`);
}

importData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());