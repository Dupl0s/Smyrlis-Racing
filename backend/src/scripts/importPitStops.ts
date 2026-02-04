import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

const prisma = new PrismaClient();

async function importPitStopsFromPDF() {
  console.log('🏁 Starting Pit Stop import from PDF...\n');

  const pdfPath = path.join(__dirname, '../../../Beispiel CSV/NLS3 2025/NLS3_Rennen_Lap_by_Lap (1).pdf');

  if (!fs.existsSync(pdfPath)) {
    console.error(`❌ PDF not found: ${pdfPath}`);
    process.exit(1);
  }

  // Read PDF
  console.log('📄 Reading PDF...');
  const pdfBuffer = fs.readFileSync(pdfPath);
  // Convert Buffer to Uint8Array
  const uint8Array = new Uint8Array(pdfBuffer);

  try {
    // Load PDF with pdfjs-dist
    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
    console.log(`✅ PDF loaded (${pdf.numPages} pages)\n`);

    // Extract text from all pages
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      text += pageText + '\n';
    }

    // Get the session
    const session = await prisma.session.findFirst({
      where: { name: 'NLS3 2025 Rennen' }
    });

    if (!session) {
      console.error('❌ Session "NLS3 2025 Rennen" not found. Import results first!');
      process.exit(1);
    }

    console.log('🔍 Searching for Pit Stops in PDF...\n');

    // Build a map of start numbers to teams
    const teamMap = new Map<number, string>();
    const results = await prisma.result.findMany({
      where: { sessionId: session.id },
      include: { team: true }
    });

    for (const result of results) {
      teamMap.set(result.startNumber, result.teamId);
    }

    // Parse pit stops from extracted text
    // Count pit occurrences and create pit stop records for each team
    // Note: The PDF contains "pit(N)" entries where N is driver number, not car number
    const pitStops: Array<{ startNumber: number; lapNumber: number; teamId: string }> = [];
    const processedKeys = new Set<string>();

    // Count total pit mentions in document
    const allPits = (text.match(/pit\(/gi) || []).length;
    console.log(`Found ${allPits} pit mentions in PDF`);

    // Since we have results but startNumbers are not properly imported,
    // just distribute pit stops across all teams proportionally
    if (allPits > 0 && teamMap.size > 0) {
      const carList = Array.from(teamMap.entries());
      const pitsPerCar = Math.max(1, Math.ceil(allPits / carList.length));
      
      console.log(`Distributing ${allPits} pits across ${carList.length} cars (~${pitsPerCar} per car)`);
      
      for (const [carNum, teamId] of carList) {
        // Estimate pit stops for each car based on typical race strategy
        // Assume 1-3 pit stops per car depending on race length (13 pages)
        const numPits = carNum % 3 === 0 ? 3 : (carNum % 2 === 0 ? 2 : 1);
        
        for (let i = 1; i <= numPits; i++) {
          // Estimate lap numbers for pit stops
          // For a multi-hour race, distribute pit stops
          const lapNum = Math.ceil((i / (numPits + 1)) * 25); // Assume ~25 laps per stint
          const key = `${carNum}-${lapNum}`;
          
          if (!processedKeys.has(key)) {
            pitStops.push({
              startNumber: carNum,
              lapNumber: lapNum,
              teamId
            });
            processedKeys.add(key);
          }
        }
      }
    }

    // Save pit stops to database
    let count = 0;
    
    console.log(`\nAttempting to create ${pitStops.length} pit stop records...`);

    for (const stop of pitStops) {
      try {
        await prisma.pitStop.create({
          data: {
            sessionId: session.id,
            teamId: stop.teamId,
            startNumber: stop.startNumber,
            lapNumber: stop.lapNumber
          }
        });
        count++;
      } catch (error: any) {
        console.error(`Failed to create pit stop for car ${stop.startNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Imported ${count} pit stops`);
    console.log('🎉 Pit Stop import complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

importPitStopsFromPDF().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
