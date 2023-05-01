import { writeFileSync } from 'fs';
import JSZip from 'jszip';
import futures from './futures.json';

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
    output.push({
      token,
      symbol,
      tradingSymbol,
    });
  }
}

output.sort((eq1, eq2) => eq1.tradingSymbol.localeCompare(eq2.tradingSymbol));
writeFileSync('equities.json', JSON.stringify(output));
