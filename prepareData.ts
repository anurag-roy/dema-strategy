import { SingleBar } from 'cli-progress';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { convertCandleToCandleWithDema } from './utils.js';

const token = readFileSync('token.txt', 'utf-8');
const START_TIME = '1672511400'; // 2023-01-01 00:00:00
const END_TIME = Date.now().toString().slice(0, -3);

console.log('Preparing data...');
const progressBar = new SingleBar({
  format: '|{bar}| Processing {value} of {total} - {stockName}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  barCompleteString: 'Prepared data successfully!',
  stopOnComplete: true,
  clearOnComplete: true,
});
progressBar.start(equities.length, 0);

for (let i = 0; i < equities.length; i++) {
  const equity = equities[i];
  progressBar.update(i + 1, { stockName: equity.symbol });

  const historicalData = await getHistoricalData({
    jKey: token,
    jData: {
      uid: env.USER_ID,
      exch: 'NSE',
      token: equity.token,
      st: START_TIME,
      et: END_TIME,
      intrv: '15',
    },
  });

  // Convert values to numbers
  const candles = convertCandleToCandleWithDema(historicalData);
  // TODO: Handle incomplete candles better
  candles.pop();
  writeFileSync(join('data', `${equity.symbol}.json`), JSON.stringify(candles));
}
