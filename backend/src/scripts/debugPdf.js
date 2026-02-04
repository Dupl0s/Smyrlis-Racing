const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

(async () => {
  const pdfPath = path.join(__dirname, '../../../Beispiel CSV/NLS3 2025/NLS3_Rennen_Lap_by_Lap (1).pdf');
  console.log('Reading from:', pdfPath);
  
  const pdfBuffer = fs.readFileSync(pdfPath);
  const uint8Array = new Uint8Array(pdfBuffer);
  
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;
  
  for (let pageNum = 1; pageNum <= Math.min(3, pdf.numPages); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const text = textContent.items.map(item => item.str).join(' ');
    
    console.log(`\n=== PAGE ${pageNum} (first 1500 chars) ===`);
    console.log(text.substring(0, 1500));
    
    // Search for "Pit"
    if (text.toLowerCase().includes('pit')) {
      console.log('\n✅ Found "Pit" on page', pageNum);
      const pitIndx = text.toLowerCase().indexOf('pit');
      console.log('Context:', text.substring(Math.max(0, pitIndx - 100), Math.min(text.length, pitIndx + 200)));
    }
  }
  
  process.exit(0);
})().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
