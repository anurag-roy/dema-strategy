import { dema } from 'indicatorts';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import env from '../env.json';
import { getHistoricalData } from './api/getHistoricalData.js';
import { getQuotes } from './api/getQuote.js';
import { placeOrder } from './api/placeOrder.js';
import { DEMA_PERIODS } from './config.js';
import equities from './data/equities.json';
import type { CandleWithDema } from './types/candle.js';
import {
  getDemaValuesFromCandle,
  getTimeToNextCandle,
  isCandleA,
  isCandleB,
} from './utils/candle-utils.js';
import { getInput } from './utils/getInput.js';

type Stock = (typeof equities)[0];
const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;

const accessToken = await readFile('token.txt', 'utf-8');
const stockMap = new Map<string, Stock>();
const stockToCandleMap = new Map<string, CandleWithDema[]>();
let candleAStocks: string[] = [];
const candleBStocks: string[] = [];

for (const equity of equities) {
  stockMap.set(equity.symbol, equity);

  const candlesJson = await readFile(
    join('src', 'data', `${equity.symbol}.json`),
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
        qty: '1',
        prd: 'I',
        prctyp: 'SL-LMT',
        ret: 'DAY',
      },
    });

    // Place exit order
    const TARGET = 1000;
    const exitPrice = isGreenCandle
      ? ((entryPrice * stock.lotSize + TARGET) / stock.lotSize).toFixed(2)
      : ((entryPrice * stock.lotSize - TARGET) / stock.lotSize).toFixed(2);
    placeOrder({
      jKey: accessToken,
      jData: {
        actid: env.USER_ID,
        uid: env.USER_ID,
        exch: 'NSE',
        tsym: stock.tradingSymbol,
        trantype: isGreenCandle ? 'S' : 'B',
        prc: exitPrice,
        qty: '1',
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
  // First priority: Check if Candle A candidates satisfy Candle B or not
  for (const c of candleAStocks) {
    const stock = stockMap.get(c)!;
    const candles = stockToCandleMap.get(c)!;

    // TODO: Place order for Candle B stocks (Only possible for last day candles, for which order needs to be placed st 9:15)

    await getLatestCandle(stock.token).then(async (latestCandle) => {
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
          // TODO: Check if greater than 20 and batch appropriately,
          // TODO: else Shoonya will rate limit(20 API calls per second)
          // TODO: In practice however, this should not be more than 20
          placeOrders(
            stock,
            latestCandleWithDema.close > latestCandleWithDema.open,
            latestCandleWithDema.open.toString()
          );
        }
      }
    });
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
