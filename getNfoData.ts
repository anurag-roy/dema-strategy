import { writeFileSync } from 'fs';
import JSZip from 'jszip';
import { STOCKS_TO_EXCLUDE } from './config.js';
import { getExpiryOptions } from './utils.js';

const expiryOptions = getExpiryOptions();
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

const futures = [];
const options = [];

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
    optiontype,
    strikePrice,
    _tickSize,
  ] = row.split(',');
  if (
    !STOCKS_TO_EXCLUDE.includes(symbol) &&
    expiryOptions.some((e) => expiry?.endsWith(e))
  ) {
    if (instrument === 'FUTSTK') {
      futures.push({
        token,
        lotSize: Number(lotSize),
        symbol,
        tradingSymbol,
        expiry,
      });
    } else if (instrument === 'OPTSTK') {
      options.push({
        token,
        lotSize: Number(lotSize),
        symbol,
        tradingSymbol,
        optiontype,
        strikePrice: Number(strikePrice),
        expiry,
      });
    }
  }
}

futures.sort((fut1, fut2) =>
  fut1.tradingSymbol.localeCompare(fut2.tradingSymbol)
);
writeFileSync('futures.json', JSON.stringify(futures));

options.sort(
  (opt1, opt2) =>
    opt1.tradingSymbol.localeCompare(opt2.tradingSymbol) ||
    opt2.strikePrice - opt1.strikePrice ||
    opt1.optiontype.localeCompare(opt2.optiontype)
);
writeFileSync('options.json', JSON.stringify(options));
