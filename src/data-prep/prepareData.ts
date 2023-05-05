import { SingleBar } from 'cli-progress';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import env from '../../env.json';
import { getHistoricalData } from '../api/getHistoricalData.js';
import equities from '../data/equities.json';
import { convertCandleToCandleWithDema } from '../utils/candle-utils.js';

const token = readFileSync('token.txt', 'utf-8');
const START_TIME = '1651343400'; // 2022-05-01 00:00:00
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
  writeFileSync(
    join('src', 'data', `${equity.symbol}.json`),
    JSON.stringify(candles, null, 2)
  );

  // Wait 500ms second to avoid getting rate limited by Shoonya API
  await setTimeout(500);
}
