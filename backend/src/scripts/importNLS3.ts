import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CSVRow {
  [key: string]: string;
}

function parseTime(timeStr: string): number {
  if (!timeStr || timeStr.trim() === '') return 0;
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

async function importNLS3Data() {
  console.log('🏁 Starting NLS3 2025 CSV import...\n');

  const csvDir = path.join(__dirname, '../../../Beispiel CSV/NLS3 2025');

  // Create Session
  console.log('📅 Creating NLS3 2025 Rennen session...');
  const raceSession = await prisma.session.create({
    data: {
      name: 'NLS3 2025 Rennen',
      type: 'RACE',
      date: new Date('2025-03-23')
    }
  });

  console.log(`✅ Session created: ${raceSession.id}\n`);

  // Cache for drivers, teams, and vehicles
  const drivers = new Map<string, string>(); // key: "firstName+lastName", value: id
  const teams = new Map<string, string>(); // key: teamName, value: id
  const vehicles = new Map<string, string>(); // key: "teamId+model+vehicleClass", value: id

  // Import Results
  const resultsCsvPath = path.join(csvDir, 'NÜRBURGRING_LANGSTRECKEN-SERIE$RENNEN$RENNEN_RESULT.CSV');
  if (fs.existsSync(resultsCsvPath)) {
    console.log('📊 Importing results...');
    const resultsData = parseCSV(resultsCsvPath);

    for (const row of resultsData) {
      // Use correct column names from NLS3 CSV format
      const driverFirstName = row['FAHRER1_VORNAME']?.trim() || '';
      const driverLastName = row['FAHRER1_NAME']?.trim() || '';
      const teamName = row['TEAM']?.trim() || '';
      const vehicleModel = row['FAHRZEUG']?.trim() || '';
      const vehicleClass = row['KLASSE']?.trim() || '';
      const startNumber = parseInt(row['STNR'] || '0');
      const position = parseInt(row['RANG'] || '0');

      // Get or create driver
      const driverKey = `${driverFirstName}+${driverLastName}`;
      let driverId = drivers.get(driverKey);
      if (!driverId) {
        const driver = await prisma.driver.create({
          data: {
            firstName: driverFirstName,
            lastName: driverLastName,
            startNumber
          }
        });
        driverId = driver.id;
        drivers.set(driverKey, driverId);
      }

      // Get or create team
      let teamId = teams.get(teamName);
      if (!teamId) {
        const team = await prisma.team.create({
          data: { name: teamName }
        });
        teamId = team.id;
        teams.set(teamName, teamId);
      }

      // Get or create vehicle
      const vehicleKey = `${teamId}+${vehicleModel}+${vehicleClass}`;
      let vehicleId = vehicles.get(vehicleKey);
      if (!vehicleId) {
        const vehicle = await prisma.vehicle.create({
          data: {
            model: vehicleModel,
            vehicleClass: vehicleClass,
            teamId: teamId
          }
        });
        vehicleId = vehicle.id;
        vehicles.set(vehicleKey, vehicleId);
      }

      // Create result
      await prisma.result.create({
        data: {
          sessionId: raceSession.id,
          driverId: driverId,
          teamId: teamId,
          vehicleId: vehicleId,
          startNumber,
          position
        }
      });
    }
    console.log(`✅ Imported ${resultsData.length} results\n`);
  }

  // Import Laps
  const lapsCsvPath = path.join(csvDir, 'NÜRBURGRING_LANGSTRECKEN-SERIE$RENNEN$RENNEN_LAPS.CSV');
  if (fs.existsSync(lapsCsvPath)) {
    console.log('🏁 Importing laps...');
    const lapsData = parseCSV(lapsCsvPath);

    let lapCount = 0;
    for (const row of lapsData) {
      const driverFirstName = row['FAHRER1_VORNAME']?.trim() || '';
      const driverLastName = row['FAHRER1_NAME']?.trim() || '';
      const vehicleModel = row['FAHRZEUG']?.trim() || '';
      const vehicleClass = row['KLASSE']?.trim() || '';
      const startNumber = parseInt(row['STNR'] || '0');
      const lapNumber = parseInt(row['RUNDE'] || '0');
      const lapTimeStr = row['RUNDENZEIT_SEKUNDEN']?.trim() || '0';
      const lapTimeSeconds = parseFloat(lapTimeStr.replace(',', '.'));

      if (!driverFirstName || !driverLastName || lapTimeSeconds === 0 || startNumber === 0) continue;

      // Get or create driver
      const driverKey = `${driverFirstName}+${driverLastName}`;
      let driverId = drivers.get(driverKey);
      if (!driverId) {
        const driver = await prisma.driver.create({
          data: {
            firstName: driverFirstName,
            lastName: driverLastName,
            startNumber
          }
        });
        driverId = driver.id;
        drivers.set(driverKey, driverId);
      }

      // Find the team and vehicle that has this car number
      // Match by looking in the vehicles we already created
      let vehicleId: string | undefined;
      const vehicleKey = Array.from(vehicles.keys()).find(key => 
        key.includes(vehicleModel) && key.includes(vehicleClass)
      );
      if (vehicleKey) {
        vehicleId = vehicles.get(vehicleKey);
      }

      // Fallback: find any vehicle with matching model and class
      if (!vehicleId) {
        const allVehicles = await prisma.vehicle.findMany({
          where: {
            model: vehicleModel,
            vehicleClass: vehicleClass
          }
        });
        if (allVehicles.length > 0) {
          vehicleId = allVehicles[0].id;
        }
      }

      // If we still don't have a vehicle, create one (should not happen if results were imported)
      if (!vehicleId) {
        // Find a team for this vehicle
        let vehicleTeamId = teams.get(row['TEAM']?.trim() || '');
        if (!vehicleTeamId) {
          const team = await prisma.team.create({
            data: { name: row['TEAM']?.trim() || `Unknown-${startNumber}` }
          });
          vehicleTeamId = team.id;
        }

        const newVehicle = await prisma.vehicle.create({
          data: {
            model: vehicleModel,
            vehicleClass: vehicleClass,
            teamId: vehicleTeamId
          }
        });
        vehicleId = newVehicle.id;
      }

      if (vehicleId) {
        await prisma.lap.create({
          data: {
            sessionId: raceSession.id,
            driverId: driverId,
            vehicleId: vehicleId,
            startNumber,
            lapNumber,
            lapTime: lapTimeSeconds
          }
        });
        lapCount++;
      }
    }
    console.log(`✅ Imported ${lapCount} laps\n`);
  }

  // Import Sector Times
  const sectorsCsvPath = path.join(csvDir, 'NÜRBURGRING_LANGSTRECKEN-SERIE$RENNEN$RENNEN_SEKTORZEITEN.CSV');
  if (fs.existsSync(sectorsCsvPath)) {
    console.log('⏱️ Importing sector times...');
    const sectorsData = parseCSV(sectorsCsvPath);

    let sectorCount = 0;
    for (const row of sectorsData) {
      const driverFirstName = row['FAHRER1_VORNAME']?.trim() || '';
      const driverLastName = row['FAHRER1_NAME']?.trim() || '';
      const startNumber = parseInt(row['STNR'] || '0');
      const lapNumber = parseInt(row['RUNDE_NR'] || '0');
      const vehicleModel = row['FAHRZEUG']?.trim() || '';
      const vehicleClass = row['KLASSE']?.trim() || '';

      // Parse sector times - handle format "M:SS.sss" and normalize comma to dot
      const parseSectorTime = (value: string | undefined): number | null => {
        if (!value || value.trim() === '') return null;
        const trimmed = value.trim();
        
        // Check if it's in time format (M:SS.sss)
        if (trimmed.includes(':')) {
          const parts = trimmed.split(':');
          if (parts.length === 2) {
            const minutes = parseInt(parts[0]);
            const seconds = parseFloat(parts[1].replace(',', '.'));
            return minutes * 60 + seconds;
          }
        }
        
        // Otherwise treat as plain number with comma as decimal separator
        const normalized = trimmed.replace(',', '.');
        const parsed = parseFloat(normalized);
        return parsed > 0 ? parsed : null;
      };

      const sector1 = parseSectorTime(row['SEKTOR1_ZEIT']);
      const sector2 = parseSectorTime(row['SEKTOR2_ZEIT']);
      const sector3 = parseSectorTime(row['SEKTOR3_ZEIT']);
      const sector4 = parseSectorTime(row['SEKTOR4_ZEIT']);
      const sector5 = parseSectorTime(row['SEKTOR5_ZEIT']);

      if (!driverFirstName || !driverLastName || startNumber === 0) continue;

      // Get or create driver
      const driverKey = `${driverFirstName}+${driverLastName}`;
      let driverId = drivers.get(driverKey);
      if (!driverId) {
        const driver = await prisma.driver.create({
          data: {
            firstName: driverFirstName,
            lastName: driverLastName,
            startNumber
          }
        });
        driverId = driver.id;
        drivers.set(driverKey, driverId);
      }

      // Find vehicle
      let vehicleId: string | undefined;
      const vehicleKey = Array.from(vehicles.keys()).find(key => 
        key.includes(vehicleModel) && key.includes(vehicleClass)
      );
      if (vehicleKey) {
        vehicleId = vehicles.get(vehicleKey);
      }

      if (!vehicleId) {
        const allVehicles = await prisma.vehicle.findMany({
          where: {
            model: vehicleModel,
            vehicleClass: vehicleClass
          }
        });
        if (allVehicles.length > 0) {
          vehicleId = allVehicles[0].id;
        }
      }

      if (vehicleId) {
        await prisma.sectorTime.create({
          data: {
            sessionId: raceSession.id,
            startNumber,
            lapNumber,
            sector1: sector1 && sector1 > 0 ? sector1 : null,
            sector2: sector2 && sector2 > 0 ? sector2 : null,
            sector3: sector3 && sector3 > 0 ? sector3 : null,
            sector4: sector4 && sector4 > 0 ? sector4 : null,
            sector5: sector5 && sector5 > 0 ? sector5 : null,
            driverId,
            vehicleId
          }
        });
        sectorCount++;
      }
    }
    console.log(`✅ Imported ${sectorCount} sector times\n`);
  }

  console.log('🎉 NLS3 2025 import complete!');
  process.exit(0);
}

importNLS3Data().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
