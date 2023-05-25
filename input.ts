import { cancel, group, intro, outro, select, text } from '@clack/prompts';
import { DEMA_PERIODS } from './config.js';
import { STRATEGY_TYPE, StrategyType } from './types.js';
import { getExpiryOptions, optionMapper } from './utils.js';

const periodOptions = DEMA_PERIODS.map(optionMapper);

export const getInput = async () => {
  intro('Please provide the required inputs to start the program');
  const groupResults = await group(
    {
      type: ({ results }) =>
        select({
          message: 'Strategy type',
          options: Object.values(STRATEGY_TYPE).map(optionMapper),
        }),
      expiry: ({ results }) => {
        if (results.type === STRATEGY_TYPE.FUTURE) {
          return select({
            message: 'Expiry',
            options: getExpiryOptions().map(optionMapper),
          });
        }
      },
      entryQuantity: ({ results }) => {
        if (
          results.type === STRATEGY_TYPE.FUTURE ||
          results.type === STRATEGY_TYPE.OPTION
        ) {
          return text({
            message: 'Entry quantity',
          });
        }
      },
      entryTarget: ({ results }) => {
        if (
          results.type === STRATEGY_TYPE.MIS ||
          results.type === STRATEGY_TYPE.CNC
        ) {
          return text({
            message: 'Entry target',
          });
        }
      },
      exitTarget: () =>
        text({
          message: 'Exit target',
        }),
      period1: ({ results }) =>
        select({
          message: 'DEMA Period 1',
          options: periodOptions,
        }),
      period2: ({ results }) =>
        select({
          message: 'DEMA Period 2',
          options: periodOptions.filter((p) => p.value !== results.period1),
        }),
      period3: ({ results }) =>
        select({
          message: 'DEMA Period 3',
          options: periodOptions.filter(
            (p) => p.value !== results.period1 && p.value !== results.period2
          ),
        }),
    },
    {
      onCancel: () => {
        cancel('Operation cancelled.');
        process.exit(0);
      },
    }
  );
  outro(`Starting strategy for ${groupResults.type}...`);

  const { entryTarget, exitTarget, entryQuantity, ...rest } = groupResults;

  return {
    entryQuantity: parseFloat(entryQuantity as string),
    entryTarget: parseFloat(entryTarget as string),
    exitTarget: parseFloat(exitTarget),
    ...rest,
  } as {
    type: StrategyType;
    expiry: string | undefined;
    entryQuantity: number;
    entryTarget: number;
    exitTarget: number;
    period1: number;
    period2: number;
    period3: number;
  };
};
