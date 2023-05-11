import { dema } from 'indicatorts';
import { chunk } from 'lodash-es';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEMA_PERIODS } from './config.js';
import env from './env.json';
import equities from './equities.json';
import { getHistoricalData } from './getHistoricalData.js';
import { getQuotes } from './getQuote.js';
import { getInput } from './input.js';
import { placeOrder } from './placeOrder.js';
import { CandleWithDema } from './types.js';
import {
  FIFTEEN_MINUTES_IN_MS,
  getDemaValuesFromCandle,
  getTimeToNextCandle,
  isCandleA,
  isCandleB,
} from './utils.js';

type Stock = (typeof equities)[0];

const accessToken = readFileSync('token.txt', 'utf-8');
const stockMap = new Map<string, Stock>();
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

const { entryTarget, exitTarget, period1, period2, period3 } = await getInput();
const demaPeriods = [period1, period2, period3] as [number, number, number];
const lastTimes = new Set<string>();

for (const [key, value] of stockToCandleMap) {
  const [lastButOneCandle, lastCandle] = value.slice(-2);
  lastTimes.add(lastCandle.time);
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

console.log('Last times are', lastTimes);
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

const placeOrders = async (
  stock: Stock,
  isGreenCandle: boolean,
  triggerPrice: string
) => {
  try {
    // Get quotes
    const quotes = await getQuotes({
      jKey: accessToken,
      jData: {
        uid: env.USER_ID,
        exch: 'NSE',
        token: stock.token,
      },
    });

    // Place entry order
    const entryPrice = isGreenCandle ? Number(quotes.sp1) : Number(quotes.bp1);
    const quantity = Math.floor(entryTarget / entryPrice).toString();
    placeOrder({
      jKey: accessToken,
      jData: {
        actid: env.USER_ID,
        uid: env.USER_ID,
        exch: 'NSE',
        tsym: stock.tradingSymbol,
        trantype: isGreenCandle ? 'B' : 'S',
        prc: entryPrice.toString(),
        trgprc: triggerPrice,
        qty: quantity,
        prd: 'I',
        prctyp: 'SL-LMT',
        ret: 'DAY',
      },
    });

    // Place exit order
    const exitPrice = isGreenCandle
      ? (entryPrice * Number(quantity) + exitTarget) / Number(quantity)
      : (entryPrice * Number(quantity) - exitTarget) / Number(quantity);
    const roundedUpExitPrice = (0.05 * Math.round(exitPrice / 0.05)).toFixed(2);
    placeOrder({
      jKey: accessToken,
      jData: {
        actid: env.USER_ID,
        uid: env.USER_ID,
        exch: 'NSE',
        tsym: stock.tradingSymbol,
        trantype: isGreenCandle ? 'S' : 'B',
        prc: roundedUpExitPrice,
        qty: quantity,
        prd: 'I',
        prctyp: 'LMT',
        ret: 'DAY',
      },
    });
  } catch (error) {
    console.error(
      `Some error occured while placing orders for ${stock.tradingSymbol}:`,
      error
    );
  }
};

const timeToNextCandle = getTimeToNextCandle(new Date());
console.log('Time to next candle in seconds:', timeToNextCandle / 1000);

const checkCandles = async () => {
  let promises: Promise<void>[] = [];
  const CHUNK_SIZE = 12;
  const chunks = chunk(candleAStocks, CHUNK_SIZE);

  // First priority: Check if Candle A candidates satisfy Candle B or not
  for (const chunk of chunks) {
    promises.push(
      ...chunk.map(async (c) => {
        const stock = stockMap.get(c)!;
        const candles = stockToCandleMap.get(c)!;

        // TODO: Place order for Candle B stocks (Only possible for last day candles, for which order needs to be placed st 9:15)

        const latestCandle = await getLatestCandle(stock.token);
        if (latestCandle) {
          // TODO: Create a function to calculate DEMA values from previous candle instead of requiring all 1000 historical candle data
          const latestCandleWithDema: CandleWithDema = {
            time: latestCandle.time,
            open: Number(latestCandle.into),
            high: Number(latestCandle.inth),
            low: Number(latestCandle.intl),
            close: Number(latestCandle.intc),
          };
          candles.push(latestCandleWithDema);

          const closeValues = candles.map((c) => c.close);
          // Calculate all dema values and populate the candles
          for (const demaPeriod of DEMA_PERIODS) {
            const demaValues = dema(demaPeriod, closeValues);
            candles[candles.length - 1][`dema${demaPeriod}`] =
              demaValues[candles.length - 1];
          }

          const latestDemaValues = getDemaValuesFromCandle(
            latestCandleWithDema,
            demaPeriods
          );
          if (isCandleB(latestCandleWithDema, latestDemaValues)) {
            console.log(`${stock.tradingSymbol} satisfied Candle B`);
            console.log({
              open: latestCandleWithDema.open,
              high: latestCandleWithDema.high,
              low: latestCandleWithDema.low,
              close: latestCandleWithDema.close,
              demaValues: latestDemaValues,
            });
            placeOrders(
              stock,
              latestCandleWithDema.close > latestCandleWithDema.open,
              latestCandleWithDema.open.toString()
            );
          }
        }
      })
    );
    await Promise.allSettled(promises);
    promises = [];
  }

  // Fill latest candle and DEMA values for all other stocks
  for (const [stockName, candles] of stockToCandleMap) {
    // Ignore if the stock was a candle A candidate
    if (candleAStocks.includes(stockName)) {
      continue;
    }

    const stock = stockMap.get(stockName)!;
    const latestCandle = await getLatestCandle(stock.token);
    if (latestCandle) {
      const latestCandleWithDema: CandleWithDema = {
        time: latestCandle.time,
        open: Number(latestCandle.into),
        high: Number(latestCandle.inth),
        low: Number(latestCandle.intl),
        close: Number(latestCandle.intc),
      };
      candles.push(latestCandleWithDema);

      const closeValues = candles.map((c) => c.close);
      // Calculate all dema values and populate the candles
      for (const demaPeriod of DEMA_PERIODS) {
        const demaValues = dema(demaPeriod, closeValues);
        candles[candles.length - 1][`dema${demaPeriod}`] =
          demaValues[candles.length - 1];
      }
    }
  }

  // Recompute Candle A candidates
  candleAStocks = [];
  for (const [stockName, candles] of stockToCandleMap) {
    const latestCandleWithDema = candles.at(-1)!;
    const latestDemaValues = getDemaValuesFromCandle(
      latestCandleWithDema,
      demaPeriods
    );

    if (isCandleA(latestCandleWithDema, latestDemaValues)) {
      candleAStocks.push(stockName);
    }

    await writeFile(
      join('data', `${stockName}.json`),
      JSON.stringify(candles),
      'utf-8'
    );
  }

  console.log('New candleAStocks', candleAStocks);
};

setTimeout(() => {
  checkCandles();
  setInterval(checkCandles, FIFTEEN_MINUTES_IN_MS);
}, timeToNextCandle);
