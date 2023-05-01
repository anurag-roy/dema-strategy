type GetHistoricalDataParams = {
  jKey: string;
  jData: {
    uid: string;
    exch: 'NSE' | 'NFO' | 'CDS' | 'MCX' | 'BSE';
    token: string;
    st: string;
    et: string;
    intrv: '1' | '3' | '5' | '10' | '15' | '30' | '60' | '120' | '240';
  };
};

type Candle = {
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

export const getHistoricalData = async (params: GetHistoricalDataParams) => {
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/TPSeries', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(params.jData) + `&jKey=${params.jKey}`,
  });
  if (!res.ok) {
    throw new Error(await res.text());
  }
  const candles: Candle[] = await res.json();
  return candles;
};
