import { ErrorResponse, Exchange, Quotes } from './types.js';

export type QuoteParams = {
  jKey: string;
  jData: {
    uid: string;
    exch: Exchange;
    token: string;
  };
};

export const getQuotes = async (params: QuoteParams) => {
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/GetQuotes', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const quotes: Quotes | ErrorResponse = await res.json();
  if (quotes.stat !== 'Ok') {
    throw new Error(quotes.emsg);
  }
  return quotes;
};
