import { cancel, group, intro, outro, select, text } from '@clack/prompts';
import { DEMA_PERIODS } from './config.js';

const periodOptions = DEMA_PERIODS.map((p) => ({
  value: p,
  label: p.toString(),
}));

export const getInput = async () => {
  intro('Please select the DEMA time periods you want to use');
  const groupResults = await group(
    {
      entryTarget: () =>
        text({
          message: 'Please enter the entry target',
        }),
      exitTarget: () =>
        text({
          message: 'Please enter the exit target',
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
  outro('Starting the strategy...');

  const { entryTarget, exitTarget, ...rest } = groupResults;

  return {
    entryTarget: parseFloat(entryTarget),
    exitTarget: parseFloat(exitTarget),
    ...rest,
  } as {
    entryTarget: number;
    exitTarget: number;
    period1: number;
    period2: number;
    period3: number;
  };
};
