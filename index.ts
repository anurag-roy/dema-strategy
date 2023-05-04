import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { getQuotes } from './getQuote.js';
import { getInput } from './input.js';
import { placeOrder } from './placeOrder.js';
import { CandleWithDema } from './types.js';
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
let candleAStocks: string[] = [];
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

console.log('Initial candleAStocks', candleAStocks);
console.log('Initial candleBStocks', candleBStocks);

const getLatestCandle = async (instrumentToken: string) => {
  const now = Date.now();
  const startTime = (now - FIFTEEN_MINUTES_IN_MS - 1 * 60 * 1000)
    .toString()
    .slice(0, -3);
  const candles = await getHistoricalData({
    jKey: accessToken,
    jData: {
      uid: env.USER_ID,
      exch: 'NSE',
      token: instrumentToken,
      st: startTime,
      et: now.toString().slice(0, -3),
      intrv: '15',
    },
  });

  return candles[0];
};

const placeEntryOrder = async (
  instrumentToken: string,
  tradingSymbol: string,
  isGreenCandle: boolean
) => {
  try {
    const quotes = await getQuotes({
      jKey: accessToken,
      jData: {
        uid: env.USER_ID,
        exch: 'NSE',
        token: instrumentToken,
      },
    });

    placeOrder({
      jKey: accessToken,
      jData: {
        actid: env.USER_ID,
        uid: env.USER_ID,
        exch: 'NSE',
        tsym: tradingSymbol,
        trantype: isGreenCandle ? 'B' : 'S',
        prc: isGreenCandle ? quotes.sp1 : quotes.bp1,
        qty: '1',
        prd: 'I',
        prctyp: 'LMT',
        ret: 'DAY',
      },
    });
  } catch (error) {
    console.error(
      `Some error occured while placing entry order for ${tradingSymbol}:`,
      error
    );
  }
};

const timeToNextCandle = getTimeToNextCandle(new Date());

setTimeout(() => {
  setInterval(async () => {
    for (const c of candleAStocks) {
      const stock = stockMap.get(c)!;
      const candles = stockToCandleMap.get(c)!;

      getLatestCandle(stock.token).then(async (latestCandle) => {
        if (latestCandle) {
          // TODO: Create a function to calculate DEMA values from previous candle instead of requiring all 1000 historical candle data
          //@ts-ignore
          candles.push(latestCandle);
          const latestCandleWithDema =
            //@ts-ignore
            convertCandleToCandleWithDema(candles).at(-1)!;
          candles[candles.length - 1] = latestCandleWithDema;
          const latestDemaValues = getDemaValuesFromCandle(
            latestCandleWithDema,
            demaPeriods
          );
          if (isCandleB(latestCandleWithDema, latestDemaValues)) {
            // TODO: Check if greater than 20 and batch appropriately,
            // TODO: else Shoonya will rate limit(20 API calls per second)
            // TODO: In practice however, this should not be more than 20
            placeEntryOrder(
              stock.token,
              stock.symbol,
              latestCandleWithDema.close > latestCandleWithDema.open
            );
          }
        }
      });
    }

    candleAStocks = [];
    for (const [stockName, candles] of stockToCandleMap) {
      const stock = stockMap.get(stockName)!;
      const latestCandle = await getLatestCandle(stock.token);
      if (latestCandle) {
        //@ts-ignore
        candles.push(latestCandle);
        const latestCandleWithDema =
          //@ts-ignore
          convertCandleToCandleWithDema(candles).at(-1)!;
        candles[candles.length - 1] = latestCandleWithDema;

        if (isCandleA(latestCandleWithDema, demaPeriods)) {
          candleAStocks.push(stockName);
        }

        await writeFile(
          join('data', `${stockName}.json`),
          JSON.stringify(candles),
          'utf-8'
        );
      }
    }
  }, FIFTEEN_MINUTES_IN_MS);
}, timeToNextCandle);
