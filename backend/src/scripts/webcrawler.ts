import * as cheerio from 'cheerio';
import * as puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

interface ScrapedSession {
  id: number;
  url: string;
  hasResults: boolean;
  files: string[];
}

/**
 * Web Crawler für VLN-Teilnehmer Seiten
 * Sucht nach URLs mit dem Pattern https://teilnehmer.vln.de/onb.php?d=xxx
 * und identifiziert Seiten mit dem Element:
 * <div class="row mb-3 align-items-end"><div class="col col-md-8"><h5>Ergebnisse</h5></div></div>
 * Extrahiert auch alle Dateien unter der Ergebnisse-Sektion
 */

const BASE_URL = 'https://teilnehmer.vln.de/onb.php?d=';
const RESULTS_PATTERN = /Ergebnisse/i;  // Case-insensitive regex for "Ergebnisse"
const OUTPUT_FILE = path.join(__dirname, '../../../crawled_sessions.txt');
const CONCURRENT_REQUESTS = 10; // Parallel requests

let browser: puppeteer.Browser | null = null;

async function getBrowser(): Promise<puppeteer.Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browser;
}

async function crawlSession(id: number): Promise<ScrapedSession> {
  const url = `${BASE_URL}${id}`;
  
  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    // Navigate to page with 30 second timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait a bit for JavaScript to render
    await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the rendered HTML content
    const html = await page.content();
    
    // Debug: Print response info for ID 235
    if (id === 235) {
      console.log(`\n📋 [ID 235 PUPPETEER]:`);
      console.log(`  - Page loaded successfully`);
      console.log(`  - HTML length: ${html.length} bytes`);
    }
    
    // Check if page has Ergebnisse section (case-insensitive with regex)
    const hasResults = RESULTS_PATTERN.test(html);
    
    // Debug: Print what we found on the page for ID 235
    if (id === 235) {
      const $ = cheerio.load(html);
      const h5Elements = $('h5');
      console.log(`\n📋 [ID 235 PARSE]:`);
      console.log(`  - hasResults (Ergebnisse regex): ${hasResults}`);
      console.log(`  - Number of <h5> elements: ${h5Elements.length}`);
      
      // Print all h5 text content
      h5Elements.each((i, el) => {
        const text = $(el).text().trim();
        console.log(`    h5[${i}]: "${text}"`);
      });
      
      // Print all links with CSV
      const allCsvLinks = $('a[href*=".csv"], a:contains(".csv")');
      console.log(`  - Number of links with .csv: ${allCsvLinks.length}`);
      allCsvLinks.each((i, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        console.log(`    csv-link[${i}]: "${text}" -> ${href}`);
      });
    }
    
    // Extract files if Ergebnisse section exists
    let files: string[] = [];
    if (hasResults) {
      const $ = cheerio.load(html);
      
      // Find all card elements that contain files
      const cards = $('.card');
      
      cards.each((_idx, card) => {
        const links = $(card).find('a');
        links.each((_linkIdx, link) => {
          const text = $(link).text().trim();
          
          // Only include CSV files (flexible matching)
          if (text && /\.csv$/i.test(text)) {
            files.push(text);
          }
        });
      });
      
      // If still no files, search all links on page for CSV
      if (files.length === 0) {
        const allLinks = $('a');
        allLinks.each((_idx, link) => {
          const text = $(link).text().trim();
          const href = $(link).attr('href');
          
          if (text && /\.csv$/i.test(text)) {
            files.push(text);
          } else if (href && /\.csv$/i.test(href)) {
            files.push(href);
          }
        });
      }
    }
    
    await page.close();

    return {
      id,
      url,
      hasResults,
      files
    };
  } catch (error) {
    if (id === 235) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : '';
      console.log(`❌ [ID 235 ERROR]: ${errorMsg}`);
      if (errorStack) {
        console.log(`  Stack: ${errorStack.split('\n')[0]}`);
      }
    }
    return {
      id,
      url,
      hasResults: false,
      files: []
    };
  }
}

async function crawlSessionsBatch(ids: number[]): Promise<ScrapedSession[]> {
  const results: ScrapedSession[] = [];
  
  for (let i = 0; i < ids.length; i += CONCURRENT_REQUESTS) {
    const batch = ids.slice(i, i + CONCURRENT_REQUESTS);
    const batchResults = await Promise.all(batch.map(id => crawlSession(id)));
    results.push(...batchResults);
    
    // Log results for debug
    batchResults.forEach(r => {
      if (r.hasResults || r.files.length > 0) {
        console.log(`  ✓ ID ${r.id}: ${r.files.length} files found`);
      }
    });
    
    console.log(`Progress: ${Math.min(i + CONCURRENT_REQUESTS, ids.length)}/${ids.length}`);
  }
  
  return results;
}

async function crawlSessions(startId: number = 1, endId: number = 200): Promise<void> {
  console.log(`🕷️  Starting VLN crawler (IDs: ${startId}-${endId}, ${CONCURRENT_REQUESTS} parallel requests)...`);
  console.log(`⏱️  Starting at ${new Date().toLocaleTimeString()}\n`);
  
  try {
    const ids = Array.from({ length: endId - startId + 1 }, (_, i) => startId + i);
    const startTime = Date.now();
    
    const results = await crawlSessionsBatch(ids);
    const sessionsWithResults = results.filter(r => r.hasResults);
    
    // Prepare output
    let output = sessionsWithResults.map(r => {
      let line = `${r.id}`;
      if (r.files.length > 0) {
        line += ` | Files: ${r.files.join('; ')}`;
      }
      return line;
    }).join('\n');

    fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Crawler complete!`);
    console.log(`Total crawled: ${results.length}`);
    console.log(`Sessions with Ergebnisse: ${sessionsWithResults.length}`);
    console.log(`Time taken: ${duration}s`);
    console.log(`Output written to: ${OUTPUT_FILE}`);
    console.log(`\nSession IDs found:`, sessionsWithResults.map(r => r.id).join(', '));
  } finally {
    // Close browser
    if (browser) {
      await browser.close();
    }
  }
}

// Run crawler
const startId = parseInt(process.argv[2] || '1', 10);
const endId = parseInt(process.argv[3] || '200', 10);

crawlSessions(startId, endId).catch(error => {
  console.error('Crawler failed:', error);
  process.exit(1);
});
