import type { ErrorResponse } from '../types/common.js';
import type { Order, PlaceOrderParams } from '../types/order.js';

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
