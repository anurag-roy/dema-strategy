import { writeFileSync } from 'fs';
import JSZip from 'jszip';
import { EXPIRY } from './config.js';

const txtFileName = 'NFO_symbols.txt';
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
    lotSize,
    symbol,
    tradingSymbol,
    expiry,
    instrument,
    _optiontype,
    _strikePrice,
    _tickSize,
  ] = row.split(',');

  if (instrument === 'FUTSTK' && expiry.endsWith(EXPIRY)) {
    output.push({
      token,
      lotSize,
      symbol,
      tradingSymbol,
    });
  }
}

output.sort((fut1, fut2) =>
  fut1.tradingSymbol.localeCompare(fut2.tradingSymbol)
);
writeFileSync('futures.json', JSON.stringify(output));
