import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MessageEvent, WebSocket } from 'ws';
import env from './env.json';
import equities from './equities.json';
import { getInput } from './input.js';
import { getDemaValuesFromCandle, isCandleA, isCandleB } from './utils.js';

const accessToken = readFileSync('token.txt', 'utf-8');

const { period1, period2, period3 } = await getInput();

const candleACandidates = [];
const candleBCandidates = [];

for (const equity of equities) {
  try {
    const candlesJson = readFileSync(
      join('data', `${equity.symbol}.json`),
      'utf-8'
    );
    const [lastButOneCandle, lastCandle] = JSON.parse(candlesJson).slice(-2);
    const lastButOneCandleDemaValues = getDemaValuesFromCandle(
      lastButOneCandle,
      [period1, period2, period3]
    );
    const lastCandleDemaValues = getDemaValuesFromCandle(lastCandle, [
      period1,
      period2,
      period3,
    ]);
    if (
      isCandleA(lastButOneCandle, lastButOneCandleDemaValues) &&
      isCandleB(lastCandle, lastCandleDemaValues)
    ) {
      candleBCandidates.push(equity.symbol);
    }
    if (isCandleA(lastCandle, lastCandleDemaValues)) {
      candleACandidates.push(equity.symbol);
    }
  } catch (error) {}
}

console.log('candleACandidates', candleACandidates);
console.log('candleBCandidates', candleBCandidates);

const ws = new WebSocket('wss://api.shoonya.com/NorenWSTP/');

ws.onopen = () => {
  console.log('Connecting to Shoonya Live Market...');
  ws.send(
    JSON.stringify({
      t: 'c',
      uid: env.USER_ID,
      actid: env.USER_ID,
      susertoken: accessToken,
      source: 'API',
    })
  );
};

ws.onclose = () => {
  console.log('Socket connection closed.');
};

ws.onerror = (error) => {
  console.log('Socket error', error);
};

ws.onmessage = (messageEvent: MessageEvent) => {
  const message = JSON.parse(messageEvent.data as string);
  if (message.t === 'tk' || message.t === 'tf') {
  } else if (message.t === 'ck' && message.s === 'OK') {
    console.log('Connected successfully! Subscribing...');
    ws.send(
      JSON.stringify({
        t: 't',
        k: equities.map((e) => `NSE|${e.token}`).join('#'),
      })
    );
  }
};
