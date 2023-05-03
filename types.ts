export type CandleWithDema = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  [key: `dema${number}`]: number;
};
