import type { Candle, GetHistoricalDataParams } from '../types/candle.js';

export const getHistoricalData = async (params: GetHistoricalDataParams) => {
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/TPSeries', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const candles: Candle[] = await res.json();
  // Ignore candles with 09:00:00 time
  return candles.filter((c) => !c.time.endsWith('09:00:00')).reverse();
};
