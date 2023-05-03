export type Exchange = 'NSE' | 'NFO' | 'CDS' | 'MCX' | 'BSE';

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
