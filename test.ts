import { readFileSync } from 'fs';
import env from './env.json';
import { getHistoricalData } from './getHistoricalData.js';

const token = readFileSync('token.txt', 'utf8');
const et = Date.now().toString().slice(0, -3);
console.log(et);

const data = await getHistoricalData({
  jKey: token,
  jData: {
    uid: env.USER_ID,
    exch: 'NSE',
    token: '438',
    st: '1682998200', // 9:00:00
    // st: '1682999999', // 9:29:59
    // st: '1682998200', // 9:00:00
    et: Date.now().toString().slice(0, -3),
    intrv: '15',
  },
});
console.log(data);
