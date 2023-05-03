import { SingleBar } from 'cli-progress';
import { dema } from 'indicatorts';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { DEMA_PERIODS } from './config.js';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { CandleWithDema } from './types.js';

const token = readFileSync('token.txt', 'utf-8');
const START_TIME = '1640975400'; // 2022-01-01
const END_TIME = Date.now().toString().slice(0, -3);

console.log('Preparing data...');
const progressBar = new SingleBar({
  format: '|{bar}| Processing {value} of {total} - {stockName}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true,
  barCompleteString: 'Prepared data successfully!',
  stopOnComplete: true,
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
  const candles: CandleWithDema[] = historicalData
    .map((c) => {
      return {
        time: c.time,
        open: Number(c.into),
        high: Number(c.inth),
        low: Number(c.intl),
        close: Number(c.intc),
      };
    })
    .reverse()
    .slice(-1000);
  const closeValues = candles.map((c) => c.close);

  // Calculate all dema values and populate the candles
  for (const demaPeriod of DEMA_PERIODS) {
    const demaValues = dema(demaPeriod, closeValues);
    for (let j = 0; j < demaValues.length; j++) {
      const demaValue = demaValues[j];
      candles[j][`dema${demaPeriod}`] = demaValue;
    }
  }

  writeFileSync(
    join('data', `${equity.symbol}.json`),
    JSON.stringify(candles, null, 2)
  );

  // Wait 1 second to avoid getting rate limited by Shoonya API
  await setTimeout(1000);
}
