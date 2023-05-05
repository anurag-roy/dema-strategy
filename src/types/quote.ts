import { Exchange } from './common.js';

export type QuoteParams = {
  jKey: string;
  jData: {
    uid: string;
    exch: Exchange;
    token: string;
  };
};

export type Quotes = {
  /**
   * Time of request
   */
  request_time: string;
  /**
   * Market watch success or failure indication
   */
  stat: 'Ok';
  /**
   * Exchange
   */
  exch: Exchange;
  /**
   * Trading Symbol
   */
  tsym: string;
  /**
   * Company Name
   */
  cname: string;
  /**
   * Symbol Name
   */
  symname: string;
  /**
   * Segment
   */
  seg: string;
  /**
   * Expiry Date
   */
  exd: string;
  /**
   * Intrument Name
   */
  instname: string;
  /**
   * Strike Price
   */
  strprc: string;
  /**
   * ISIN
   */
  isin: string;
  /**
   * Tick Size
   */
  ti: string;
  /**
   * Lot Size
   */
  ls: string;
  /**
   * Price precision
   */
  pp: string;
  /**
   * Multiplier
   */
  mult: string;
  /**
   * Upper circuit limit
   */
  uc: string;
  /**
   * Lower circuit limit
   */
  lc: string;
  /**
   * Price factor ((GN / GD) * (PN/PD))
   */
  prcftr_d: string;
  /**
   * Token
   */
  token: string;
  /**
   * LTP
   */
  lp: string;
  /**
   * Open Price
   */
  o: string;
  /**
   * Day High Price
   */
  h: string;
  /**
   * Day Low Price
   */
  l: string;
  /**
   * Close Price
   */
  c: string;
  /**
   * Volume
   */
  v: string;
  /**
   * Last trade quantity
   */
  ltq: string;
  /**
   * Last trade time
   */
  ltt: string;
  /**
   * Best Buy Price 1
   */
  bp1: string;
  /**
   * Best Sell Price 1
   */
  sp1: string;
  /**
   * Best Buy Price 2
   */
  bp2: string;
  /**
   * Best Sell Price 2
   */
  sp2: string;
  /**
   * Best Buy Price 3
   */
  bp3: string;
  /**
   * Best Sell Price 3
   */
  sp3: string;
  /**
   * Best Buy Price 4
   */
  bp4: string;
  /**
   * Best Sell Price 4
   */
  sp4: string;
  /**
   * Best Buy Price 5
   */
  bp5: string;
  /**
   * Best Sell Price 5
   */
  sp5: string;
  /**
   * Best Buy Quantity 1
   */
  bq1: string;
  /**
   * Best Sell Quantity 1
   */
  sq1: string;
  /**
   * Best Buy Quantity 2
   */
  bq2: string;
  /**
   * Best Sell Quantity 2
   */
  sq2: string;
  /**
   * Best Buy Quantity 3
   */
  bq3: string;
  /**
   * Best Sell Quantity 3
   */
  sq3: string;
  /**
   * Best Buy Quantity 4
   */
  bq4: string;
  /**
   * Best Sell Quantity 4
   */
  sq4: string;
  /**
   * Best Buy Quantity 5
   */
  bq5: string;
  /**
   * Best Sell Quantity 5
   */
  sq5: string;
  /**
   * Best Buy Order 1
   */
  bo1: string;
  /**
   * Best Sell Order 1
   */
  so1: string;
  /**
   * Best Buy Order 2
   */
  bo2: string;
  /**
   * Best Sell Order 2
   */
  so2: string;
  /**
   * Best Buy Order 3
   */
  bo3: string;
  /**
   * Best Sell Order 3
   */
  so3: string;
  /**
   * Best Buy Order 4
   */
  bo4: string;
  /**
   * Best Sell Order 4
   */
  so4: string;
  /**
   * Best Buy Order 5
   */
  bo5: string;
  /**
   * Best Sell Order 5
   */
  so5: string;
};
