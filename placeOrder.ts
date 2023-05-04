import { ErrorResponse, Exchange, Order } from './types.js';

export type PlaceOrderParams = {
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

export const placeOrder = async (params: PlaceOrderParams) => {
  console.log(
    `[${new Date().toLocaleTimeString()}] Placing order for ${
      params.jData.tsym
    }`
  );
  try {
    const res = await fetch(
      'https://api.shoonya.com/NorenWClientTP/PlaceOrder',
      {
        method: 'POST',
        body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
      }
    );
    if (!res.ok) {
      throw new Error(await res.text());
    }
    const orderResult: Order | ErrorResponse = await res.json();
    if (orderResult.stat === 'Not_Ok') {
      throw new Error(orderResult.emsg);
    }
    console.log('Order placed successfully', orderResult);
  } catch (error) {
    console.error(`Failed to place order for ${params.jData.tsym}:`, error);
  }
};
