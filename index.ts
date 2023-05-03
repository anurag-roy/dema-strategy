import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { getInput } from './input.js';
import { CandleWithDema, Exchange } from './types.js';
import {
  FIFTEEN_MINUTES_IN_MS,
  convertCandleToCandleWithDema,
  getDemaValuesFromCandle,
  getTimeToNextCandle,
  isCandleA,
  isCandleB,
} from './utils.js';

const accessToken = readFileSync('token.txt', 'utf-8');
const stockMap = new Map<string, (typeof equities)[0]>();
const stockToCandleMap = new Map<string, CandleWithDema[]>();
const candleAStocks: string[] = [];
const candleBStocks: string[] = [];

for (const equity of equities) {
  stockMap.set(equity.symbol, equity);

  const candlesJson = readFileSync(
    join('data', `${equity.symbol}.json`),
    'utf-8'
  );
  const candles = JSON.parse(candlesJson);
  stockToCandleMap.set(equity.symbol, candles);
}

const { period1, period2, period3 } = await getInput();
const demaPeriods = [period1, period2, period3] as [number, number, number];

for (const [key, value] of stockToCandleMap) {
  const [lastButOneCandle, lastCandle] = value.slice(-2);
  const lastButOneCandleDemaValues = getDemaValuesFromCandle(
    lastButOneCandle,
    demaPeriods
  );
  const lastCandleDemaValues = getDemaValuesFromCandle(lastCandle, demaPeriods);
  if (
    isCandleA(lastButOneCandle, lastButOneCandleDemaValues) &&
    isCandleB(lastCandle, lastCandleDemaValues)
  ) {
    candleBStocks.push(key);
  }
  if (isCandleA(lastCandle, lastCandleDemaValues)) {
    candleAStocks.push(key);
  }
}

console.log('candleACandidates', candleAStocks);
console.log('candleBCandidates', candleBStocks);

const getLatestCandle = async (exchange: Exchange, instrumentToken: string) => {
  const now = Date.now();
  const startTime = (now - FIFTEEN_MINUTES_IN_MS - 1 * 60 * 1000)
    .toString()
    .slice(0, -3);
  const candles = await getHistoricalData({
    jKey: accessToken,
    jData: {
      uid: env.USER_ID,
      exch: exchange,
      token: instrumentToken,
      st: startTime,
      et: now.toString().slice(0, -3),
      intrv: '15',
    },
  });

  return candles[0];
};

const timeToNextCandle = getTimeToNextCandle(new Date());

setTimeout(() => {
  setInterval(async () => {
    for (const c of candleAStocks) {
      const stock = stockMap.get(c)!;
      const candles = stockToCandleMap.get(c)!;

      const latestCandle = await getLatestCandle('NSE', stock.token);
      if (latestCandle) {
        // TODO: Create a function to calculate DEMA values from previous candle instead of requiring all 1000 historical candle data
        //@ts-ignore
        candles.push(latestCandle);
        const latestCandleWithDema =
          //@ts-ignore
          convertCandleToCandleWithDema(candles).at(-1)!;
        const latestDemaValues = getDemaValuesFromCandle(
          latestCandleWithDema,
          demaPeriods
        );
        // TODO: Check if Candle A is green or red
        if (isCandleB(latestCandleWithDema, latestDemaValues)) {
          // TODO: Place Order here
        }
      }
      // TODO: Update json file with latest values
    }
    // TODO: Clear candleA and repopulate candleA
    // TODO: Loop through
  }, FIFTEEN_MINUTES_IN_MS);
}, timeToNextCandle);
