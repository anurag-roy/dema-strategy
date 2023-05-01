import { createHash } from 'node:crypto';
import { Candle } from './types.js';

export const getHash = (input: string) =>
  createHash('sha256').update(input).digest('hex');

/**
 * Determine if a dema value is touching any part of the candle
 *
 * @param candle The candle to be considered
 * @param demaValue The DEMA value of the candle
 */
export const isTouching = (candle: Candle, demaValue: number) =>
  demaValue >= candle.l && demaValue <= candle.h;

/**
 * Determine if a dema value is touching the candle body
 *
 * @param candle The candle to be considered
 * @param demaValue The DEMA value of the candle
 */
export const isBodyTouching = (candle: Candle, demaValue: number) => {
  return (
    (demaValue >= candle.o && demaValue <= candle.c) ||
    (demaValue <= candle.o && demaValue >= candle.c)
  );
};

/**
 * Check if a candle satisfies condition A which is
 * the candle should not be touching any DEMA value and
 * all o,h,l,c values should be greater than all DEMA values
 *
 * @param candle The candle to be considered
 * @param demaValues Dema values for the candle
 * @returns true if the candle satisfies condition A, false otherwise.
 */
export const isCandleA = (
  candle: Candle,
  demaValues: [number, number, number]
) => {
  return demaValues.every(
    (v) =>
      !isTouching(candle, v) &&
      candle.o > v &&
      candle.h > v &&
      candle.l > v &&
      candle.c > v
  );
};

/**
 * Check if a candle satisfies condition B which is
 * the candle body should touch all DEMA values and
 * the candle itself should be a red candle i.e.
 * close is lower than open
 *
 * @param candle The candle to be considered
 * @param demaValues Dema values for the candle
 * @returns true if the candle satisfies condition B, false otherwise.
 */
export const isCandleB = (
  candle: Candle,
  demaValues: [number, number, number]
) => {
  return (
    candle.c < candle.o && demaValues.every((v) => isBodyTouching(candle, v))
  );
};
