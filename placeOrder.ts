import { Exchange } from './types.js';

type PlaceOrderParams = {
  jKey: string;
  jData: {
    uid: string;
    actid: string;
    exch: Exchange;
    tsym: string;
    qty: string;
    prc: string;
    prd: 'C' | 'M' | 'I' | 'B' | 'H';
    trantype: 'B' | 'S';
    prctyp: 'LMT' | 'MKT' | 'SL-LMT' | 'SL-MKT' | 'DS' | '2L' | '3L';
    ret: 'DAY' | 'EOS' | 'IOC';
  };
};

type Order =
  | {
      request_time: string;
      stat: 'Ok';
      norenordno: string;
    }
  | {
      request_time: string;
      stat: 'Not_Ok';
      emsg: string;
    };

export const placeOrder = async (params: PlaceOrderParams) => {
  console.log(
    `[${new Date().toLocaleTimeString()}] Placing order`,
    params.jData
  );
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/PlaceOrder', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const orderResult: Order = await res.json();
  if (orderResult.stat === 'Not_Ok') {
    throw new Error(orderResult.emsg);
  }
  console.log('Order placed successfully', orderResult);
  return orderResult;
};
