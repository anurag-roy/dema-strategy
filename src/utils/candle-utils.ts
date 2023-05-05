import { dema } from 'indicatorts';
import { DEMA_PERIODS } from '../config.js';
import type { Candle, CandleWithDema } from '../types/candle.js';

/**
 * Get how much time is left to the next candle i.e. the next
 * 15th minute mark (10:15, 10:30, 10:45, etc) from the date given in input.
 *
 * @param date Date to be considered
 * @returns the time in millis
 */
export const getTimeToNextCandle = (date: Date) => {
  const currentMinute = date.getMinutes();

  const offset = Math.floor(currentMinute / 15);
  let nextMinute = (offset + 1) * 15;
  nextMinute = nextMinute >= 60 ? 0 : nextMinute;

  const nextCandleTime = new Date(date);
  nextCandleTime.setMinutes(nextMinute);
  nextCandleTime.setSeconds(1);
  nextCandleTime.setMilliseconds(0);
  if (nextMinute === 0) {
    nextCandleTime.setHours(date.getHours() + 1);
  }

  return nextCandleTime.valueOf() - date.valueOf();
};

/**
 * Get the DEMA values for the corresponding DEMA periods
 * from a candle.
 *
 * @param candle Candle from which DEMA values will be plucked
 * @param demaPeriods The DEMA periods for which the values will be plucked
 * @returns the DEMA values in order of the provided DEMA periods
 */
export const getDemaValuesFromCandle = (
  candle: CandleWithDema,
  demaPeriods: [number, number, number]
) => {
  return demaPeriods.map((p) => candle[`dema${p}`]) as [number, number, number];
};

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
 * the candle should not be touching any DEMA values
 * and all the values will be on a single side of the candle
 * i.e. either all are below or all are above
 *
 * @param candle The candle to be considered
 * @param demaValues Dema values for the candle
 * @returns true if the candle satisfies condition A, false otherwise.
 */
export const isCandleA = (
  candle: CandleWithDema,
  demaValues: [number, number, number]
) => {
  return (
    demaValues.every((v) => v < candle.low) ||
    demaValues.every((v) => v > candle.high)
  );
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

/**
 * Convert candles response from Shoonya API to candles with DEMA values
 *
 * @param data Candles response from Shoonya API
 * @returns Candles with DEMA values populated for all DEMA periods.
 */
export const convertCandleToCandleWithDema = (data: Candle[]) => {
  const candles: CandleWithDema[] = data
    .map((c) => {
      return {
        time: c.time,
        open: Number(c.into),
        high: Number(c.inth),
        low: Number(c.intl),
        close: Number(c.intc),
      };
    })
    .slice(-1000);
  const closeValues = candles.map((c) => c.close);

  // Calculate all dema values and populate the candles
  for (const demaPeriod of DEMA_PERIODS) {
    const demaValues = dema(demaPeriod, closeValues);
    for (let j = 0; j < demaValues.length; j++) {
      const demaValue = demaValues[j];
      candles[j][`dema${demaPeriod}`] = demaValue;
    }
  }

  return candles;
};
