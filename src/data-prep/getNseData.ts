import JSZip from 'jszip';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import futures from '../data/futures.json';

const stocksToInclude = futures.map((f) => f.symbol);

const txtFileName = 'NSE_symbols.txt';
const zipFileName = txtFileName + '.zip';

const res = await fetch('https://api.shoonya.com/' + zipFileName);
const arrayBuffer = await res.arrayBuffer();

const jsZip = new JSZip();
const result = await jsZip.loadAsync(arrayBuffer);
const file = result.file(txtFileName);
if (!file) {
  ('Did not find the expected .txt file. Exiitng...');
  process.exit(1);
}

const output = [];

const fileContents = await file.async('text');
const rows = fileContents.split('\n').slice(1);

for (const row of rows) {
  const [
    _exchange,
    token,
    _lotSize,
    symbol,
    tradingSymbol,
    instrument,
    _tickSize,
  ] = row.split(',');

  if (instrument === 'EQ' && stocksToInclude.includes(symbol)) {
    const futureEquivalent = futures.find((f) => f.symbol === symbol);
    if (futureEquivalent) {
      output.push({
        token,
        symbol,
        tradingSymbol,
        lotSize: futureEquivalent.lotSize,
      });
    }
  }
}

output.sort((eq1, eq2) => eq1.tradingSymbol.localeCompare(eq2.tradingSymbol));
writeFileSync(join('src', 'data', 'equities.json'), JSON.stringify(output));
