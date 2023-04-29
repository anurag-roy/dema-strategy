import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';

const rl = readline.createInterface({ input, output });
const period1String = await rl.question('Period 1: ');
const period2String = await rl.question('Period 2: ');
const period3String = await rl.question('Period 3: ');
rl.close();

const period1 = Number(period1String);
const period2 = Number(period2String);
const period3 = Number(period3String);
if (Number.isNaN(period1) || Number.isNaN(period2) || Number.isNaN(period3)) {
  console.error('Expected periods to be numbers. Cannot proceed. Exiting...');
  process.exit(1);
}
