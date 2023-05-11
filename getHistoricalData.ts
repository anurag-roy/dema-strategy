import { Candle, Exchange } from './types.js';
import { FIFTEEN_MINUTES_IN_MS } from './utils.js';

type GetHistoricalDataParams = {
  jKey: string;
  jData: {
    uid: string;
    exch: Exchange;
    token: string;
    st: string;
    et: string;
    intrv: '1' | '3' | '5' | '10' | '15' | '30' | '60' | '120' | '240';
  };
};

export const getHistoricalData = async (params: GetHistoricalDataParams) => {
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/TPSeries', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  let candles: Candle[] = await res.json();

  // Ignore candles with 09:00:00 time
  candles = candles.filter((c) => !c.time.endsWith('09:00:00')).reverse();

  // Check if last candle is complete or incomplete
  const lastCandle = candles.at(-1);
  if (lastCandle) {
    const [day, month, ...rest] = lastCandle.time.split('-');
    const reformattedDateString = [month, day, ...rest].join('-');
    const millis = new Date(reformattedDateString).getTime();

    if (Date.now() - millis < FIFTEEN_MINUTES_IN_MS) {
      // Last candle is incomplete
      candles = candles.slice(0, -1);
    }
  }

  return candles;
};
