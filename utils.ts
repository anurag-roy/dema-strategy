import { createHash } from 'node:crypto';
import { Candle } from './types.js';

export const getHash = (input: string) =>
  createHash('sha256').update(input).digest('hex');

/**
 * Determine if a dema value is touching the candle body
 * @param candle The candle to be considered
 * @param demaValue The DEMA value of the candle
 */
export const isTouching = (candle: Candle, demaValue: number) => {
  return (
    (demaValue >= candle.o && demaValue <= candle.c) ||
    (demaValue <= candle.o && demaValue >= candle.c)
  );
};
