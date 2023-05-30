import { dema } from 'indicatorts';
import { chunk } from 'lodash-es';
import { readFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEMA_PERIODS, REVERSE_STOCKS } from './config.js';
import env from './env.json';
import equities from './equities.json';
import futures from './futures.json';
import { getHistoricalData } from './getHistoricalData.js';
import { getQuotes } from './getQuote.js';
import { getInput } from './input.js';
import options from './options.json';
import { placeOrder } from './placeOrder.js';
import { CandleWithDema, Exchange } from './types.js';
import {
  FIFTEEN_MINUTES_IN_MS,
  getDemaValuesFromCandle,
  getTimeToNextCandle,
  isCandleA,
  isCandleB,
} from './utils.js';

type Stock = (typeof equities)[0];

const TODAY_TWO_THIRTY = (() => {
  const date = new Date();
  date.setHours(14);
  date.setMinutes(30);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date.valueOf();
})();
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

const {
  type,
  expiry,
  entryQuantity,
  entryTarget,
  exitTarget,
  period1,
  period2,
  period3,
} = await getInput();
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

const getLatestCandle = async (instrumentToken: string, exchange: Exchange) => {
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

const placeOrders = async (
  stock: Stock,
  isGreenCandle: boolean,
  triggerPrice: string
) => {
  if (type === 'CNC' && !isGreenCandle) {
    console.log(
      `Not placing order for ${stock.symbol} since current strategy type is CNC.`
    );
    return;
  }
  try {
    if (type === 'MIS' || type === 'CNC') {
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
      const entryPrice = isGreenCandle
        ? Number(quotes.bp1)
        : Number(quotes.sp1);
      const quantity = Math.floor(entryTarget / entryPrice).toString();

      if (quantity === '0') {
        console.log('Quantity is 0. Order not placed for', stock.tradingSymbol);
        return;
      }

      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NSE',
          tsym: stock.tradingSymbol,
          trantype: isGreenCandle ? 'B' : 'S',
          prc: entryPrice.toString(),
          qty: quantity,
          prd: type === 'CNC' ? 'C' : 'I',
          prctyp: 'LMT',
          ret: 'DAY',
        },
      });

      // Place exit order
      const exitPrice = isGreenCandle
        ? (entryPrice * Number(quantity) + exitTarget) / Number(quantity)
        : (entryPrice * Number(quantity) - exitTarget) / Number(quantity);
      const roundedUpExitPrice = (0.05 * Math.round(exitPrice / 0.05)).toFixed(
        2
      );

      // SL Order
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NSE',
          tsym: stock.tradingSymbol,
          trantype: isGreenCandle ? 'S' : 'B',
          prc: triggerPrice,
          trgprc: triggerPrice,
          qty: quantity,
          prd: 'I',
          prctyp: 'SL-LMT',
          ret: 'DAY',
        },
      });

      // Normal Exit Order
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
    } else if (type === 'FUTURE') {
      const futureStock = futures.find(
        (f) => f.symbol === stock.symbol && f.expiry.endsWith(expiry!)
      );
      if (!futureStock) {
        console.log(
          'Data issue! No corresponding future found for stock',
          stock.symbol,
          'and expiry',
          expiry
        );
        return;
      }
      // Get Quotes
      const quotes = await getQuotes({
        jKey: accessToken,
        jData: {
          exch: 'NFO',
          uid: env.USER_ID,
          token: futureStock.token,
        },
      });

      // Place entry order
      const entryPrice = isGreenCandle
        ? Number(quotes.bp1)
        : Number(quotes.sp1);
      const quantity = futureStock.lotSize * entryQuantity;
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NFO',
          tsym: futureStock.tradingSymbol,
          trantype: isGreenCandle ? 'B' : 'S',
          prc: entryPrice.toString(),
          qty: quantity.toString(),
          prd: 'M',
          prctyp: 'LMT',
          ret: 'DAY',
        },
      });

      // Place exit order
      const exitPrice = isGreenCandle
        ? (entryPrice * quantity + exitTarget) / quantity
        : (entryPrice * quantity - exitTarget) / quantity;
      const roundedUpExitPrice = (0.05 * Math.round(exitPrice / 0.05)).toFixed(
        2
      );

      const latestFutCandle = await getLatestCandle(futureStock.token, 'NFO');

      // SL Order
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NFO',
          tsym: futureStock.tradingSymbol,
          trantype: isGreenCandle ? 'S' : 'B',
          prc: latestFutCandle.into,
          trgprc: latestFutCandle.into,
          qty: quantity.toString(),
          prd: 'M',
          prctyp: 'SL-LMT',
          ret: 'DAY',
        },
      });

      // Normal Exit Order
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NFO',
          tsym: futureStock.tradingSymbol,
          trantype: isGreenCandle ? 'S' : 'B',
          prc: roundedUpExitPrice,
          qty: quantity.toString(),
          prd: 'M',
          prctyp: 'LMT',
          ret: 'DAY',
        },
      });
    } else if (type === 'OPTION') {
      // Get quotes
      const equityQuotes = await getQuotes({
        jKey: accessToken,
        jData: {
          uid: env.USER_ID,
          exch: 'NSE',
          token: stock.token,
        },
      });

      const equityLtp = Number(equityQuotes.lp);
      const target = isGreenCandle ? 0.85 * equityLtp : 1.15 * equityLtp;
      const optionType = isGreenCandle ? 'PE' : 'CE';

      const optionStocks = options.filter(
        (o) =>
          o.symbol === stock.symbol &&
          o.expiry.endsWith(expiry) &&
          o.optiontype === optionType
      );
      const [nearestStock] = optionStocks.sort(
        (s1, s2) =>
          Math.abs(target - s1.strikePrice) - Math.abs(target - s2.strikePrice)
      );

      const optionQuotes = await getQuotes({
        jKey: accessToken,
        jData: {
          uid: env.USER_ID,
          exch: 'NFO',
          token: nearestStock.token,
        },
      });

      if (!('sp1' in optionQuotes)) {
        console.log(
          `Seller not not present for ${nearestStock.tradingSymbol}. Ignoring...`
        );
        return;
      }

      // Place entry order
      const entryPrice = Number(optionQuotes.sp1);
      const quantity = nearestStock.lotSize * entryQuantity;
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NFO',
          tsym: nearestStock.tradingSymbol,
          trantype: 'S',
          prc: entryPrice.toString(),
          qty: quantity.toString(),
          prd: 'M',
          prctyp: 'LMT',
          ret: 'DAY',
        },
      });

      // Place exit order
      const exitPrice = (entryPrice * quantity - exitTarget) / quantity;
      const roundedUpExitPrice = (0.05 * Math.round(exitPrice / 0.05)).toFixed(
        2
      );

      // Normal Exit Order
      placeOrder({
        jKey: accessToken,
        jData: {
          actid: env.USER_ID,
          uid: env.USER_ID,
          exch: 'NFO',
          tsym: nearestStock.tradingSymbol,
          trantype: 'B',
          prc: roundedUpExitPrice,
          qty: quantity.toString(),
          prd: 'M',
          prctyp: 'LMT',
          ret: 'DAY',
        },
      });
    }
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

        const latestCandle = await getLatestCandle(stock.token, 'NSE');
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
            const isOpposite =
              REVERSE_STOCKS.includes(stock.symbol) ||
              Date.now() > TODAY_TWO_THIRTY;
            placeOrders(
              stock,
              isOpposite
                ? latestCandleWithDema.close < latestCandleWithDema.open
                : latestCandleWithDema.close > latestCandleWithDema.open,
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
    const latestCandle = await getLatestCandle(stock.token, 'NSE');
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
