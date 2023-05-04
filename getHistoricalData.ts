import { Candle, Exchange } from './types.js';

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
  const candles: Candle[] = await res.json();
  // Ignore candles with 09:00:00 time
  return candles.filter((c) => !c.time.endsWith('09:00:00')).reverse();
};
