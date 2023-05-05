import { Exchange } from './common.js';

export type PlaceOrderParams = {
  jKey: string;
  jData: {
    uid: string;
    actid: string;
    exch: Exchange;
    tsym: string;
    qty: string;
    prc: string;
    trgprc?: string;
    prd: 'C' | 'M' | 'I' | 'B' | 'H';
    trantype: 'B' | 'S';
    prctyp: 'LMT' | 'MKT' | 'SL-LMT' | 'SL-MKT' | 'DS' | '2L' | '3L';
    ret: 'DAY' | 'EOS' | 'IOC';
  };
};

export type Order = {
  request_time: string;
  stat: 'Ok';
  norenordno: string;
};
