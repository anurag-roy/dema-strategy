import { SingleBar } from 'cli-progress';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { CandleWithDema } from './types.js';
import { getTimeFromCandle, ingestNewCandles } from './utils.js';

const token = await readFile('token.txt', 'utf-8');
const DEFAULT_START_TIME = '1672511400'; // 2023-01-01 00:00:00
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
  let candles: CandleWithDema[] = [];
  progressBar.update(i + 1, { stockName: equity.symbol });

  const dataFilePath = join('data', `${equity.symbol}.json`);
  let startTime = DEFAULT_START_TIME;
  try {
    candles = JSON.parse(await readFile(dataFilePath, 'utf-8'));
    const latestCandle = candles.at(-1);
    if (latestCandle) {
      // Set startTime to the time of the last fetched candle
      startTime = getTimeFromCandle(latestCandle);
    }
  } catch (error) {}

  const historicalData = await getHistoricalData({
    jKey: token,
    jData: {
      uid: env.USER_ID,
      exch: 'NSE',
      token: equity.token,
      st: startTime,
      et: END_TIME,
      intrv: '15',
    },
  });

  if (historicalData.length > 0) {
    candles = ingestNewCandles(candles, historicalData);
    await writeFile(dataFilePath, JSON.stringify(candles));
  }
}
