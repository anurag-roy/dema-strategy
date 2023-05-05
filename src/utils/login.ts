import { writeFileSync } from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import env from '../env.json';
import { getHash } from './getHash.js';

const rl = readline.createInterface({ input, output });
const totp = await rl.question('Please enter TOTP to login: ');
rl.close();

const data = {
  apkversion: 'js:1.0.0',
  uid: env.USER_ID,
  pwd: getHash(env.PASSWORD),
  factor2: totp,
  vc: env.VENDOR_CODE,
  appkey: getHash(`${env.USER_ID}|${env.API_KEY}`),
  imei: env.IMEI,
  source: 'API',
};

try {
  const res = await fetch('https://api.shoonya.com/NorenWClientTP/QuickAuth', {
    method: 'POST',
    body: 'jData=' + JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error(await res.text());
  }

  const response = await res.json();
  if (response.stat === 'Not_Ok') {
    throw new Error(response.emsg);
  }

  writeFileSync('token.txt', response.susertoken, 'utf-8');
  console.log('Login successful!');
} catch (error) {
  console.error('Error while logging in', error);
}
