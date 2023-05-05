import { Exchange } from './common.js';

export type GetHistoricalDataParams = {
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

export type Candle = {
  stat: string;
  time: string;
  ssboe: string;
  into: string;
  inth: string;
  intl: string;
  intc: string;
  intvwap: string;
  intv: string;
  intoi: string;
  v: string;
  oi: string;
};

export type CandleWithDema = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: `dema${number}`]: number;
};
