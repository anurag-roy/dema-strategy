import { readFileSync } from 'fs';
import { setTimeout } from 'timers';
import env from './env.json';
import { getHistoricalData } from './getHistoricalData.js';
import { Exchange } from './types.js';
import { FIFTEEN_MINUTES_IN_MS, getTimeToNextCandle } from './utils.js';

const token = readFileSync('token.txt', 'utf8');

const getLatestCandle = async (exchange: Exchange, instrumentToken: string) => {
  const now = Date.now();
  const startTime = (now - FIFTEEN_MINUTES_IN_MS - 1 * 60 * 1000)
    .toString()
    .slice(0, -3);
  const candles = await getHistoricalData({
    jKey: token,
    jData: {
      uid: env.USER_ID,
      exch: exchange,
      token: instrumentToken,
      st: startTime,
      et: now.toString().slice(0, -3),
      intrv: '15',
    },
  });

  return candles[0] ?? [];
};

const timeToNextCandle = getTimeToNextCandle(new Date());

setTimeout(() => {
  setInterval(async () => {
    const now = Date.now();
    const startTime = (now - FIFTEEN_MINUTES_IN_MS - 1 * 60 * 1000)
      .toString()
      .slice(0, -3);
    console.log(`[${new Date().toLocaleTimeString()}] Fetching new candle`);
    const latestCandle = await getLatestCandle('NSE', '438');
  }, FIFTEEN_MINUTES_IN_MS);
}, timeToNextCandle);

const data = await getHistoricalData({
  jKey: token,
  jData: {
    uid: env.USER_ID,
    exch: 'NSE',
    token: '438',
    st: '1682998200',
    et: Date.now().toString().slice(0, -3),
    intrv: '15',
  },
});
console.log(data);
