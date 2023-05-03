import { createHash } from 'node:crypto';
import { CandleWithDema } from './types.js';

export const getHash = (input: string) =>
  createHash('sha256').update(input).digest('hex');

export const getDemaValuesFromCandle = (
  candle: CandleWithDema,
  demaPeriods: [number, number, number]
) => {
  return demaPeriods.map((p) => candle[`dema${p}`]) as [number, number, number];
};

/**
 * Determine if a dema value is touching any part of the candle
 *
 * @param candle The candle to be considered
 * @param demaValue The DEMA value of the candle
 */
export const isTouching = (candle: CandleWithDema, demaValue: number) =>
  demaValue >= candle.low && demaValue <= candle.high;

/**
 * Determine if a dema value is touching the candle body
 *
 * @param candle The candle to be considered
 * @param demaValue The DEMA value of the candle
 */
export const isBodyTouching = (candle: CandleWithDema, demaValue: number) => {
  return (
    (demaValue >= candle.open && demaValue <= candle.close) ||
    (demaValue <= candle.open && demaValue >= candle.close)
  );
};

/**
 * Check if a candle satisfies condition A which is
 * the candle should not be touching any DEMA value
 *
 * @param candle The candle to be considered
 * @param demaValues Dema values for the candle
 * @returns true if the candle satisfies condition A, false otherwise.
 */
export const isCandleA = (
  candle: CandleWithDema,
  demaValues: [number, number, number]
) => {
  return demaValues.every((v) => !isTouching(candle, v));
};

/**
 * Check if a candle satisfies condition B which is
 * the candle body should touch all DEMA values
 *
 * @param candle The candle to be considered
 * @param demaValues Dema values for the candle
 * @returns true if the candle satisfies condition B, false otherwise.
 */
export const isCandleB = (
  candle: CandleWithDema,
  demaValues: [number, number, number]
) => {
  return demaValues.every((v) => isBodyTouching(candle, v));
};
