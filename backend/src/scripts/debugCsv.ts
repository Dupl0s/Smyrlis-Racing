import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

function parseCSV(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  return parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_column_count: true,
    relax_quotes: true
  });
}

const csvDir = path.join(__dirname, '../../../Beispiel CSV');
const qualiResults = parseCSV(path.join(csvDir, 'NLS1_ZEITTRAINING_TRAINING_RESULT.CSV'));

console.log(`Total rows: ${qualiResults.length}`);
console.log(`\n📋 First row columns:`, Object.keys(qualiResults[0]).slice(0, 20));
console.log(`\n✅ Row 0 (STNR 8):`);
console.log(JSON.stringify({ 
  STNR: qualiResults[0].STNR,
  BEWERBER: qualiResults[0].BEWERBER,
  FAHRER1_NAME: qualiResults[0].FAHRER1_NAME,
  FAHRER1_VORNAME: qualiResults[0].FAHRER1_VORNAME,
  FAHRZEUG: qualiResults[0].FAHRZEUG,
  RANG: qualiResults[0].RANG
}, null, 2));

// Find row with STNR 150
const row150 = qualiResults.find((r: any) => r.STNR === '150');
console.log(`\n❌ Row with STNR 150:`);
console.log(JSON.stringify({ 
  STNR: row150.STNR,
  BEWERBER: row150.BEWERBER,
  FAHRER1_NAME: row150.FAHRER1_NAME,
  FAHRER1_VORNAME: row150.FAHRER1_VORNAME,
  FAHRZEUG: row150.FAHRZEUG,
  RANG: row150.RANG
}, null, 2));

// Show all columns for row 150 to debug
console.log(`\n🔍 All fields for row 150:`, Object.keys(row150).length, 'columns');
Object.keys(row150).forEach((key, idx) => {
  if (idx < 30) {
    console.log(`  [${idx}] ${key} = "${row150[key]}"`);
  }
});
