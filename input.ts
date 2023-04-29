import { cancel, group, intro, outro, select } from '@clack/prompts';

const demaPeriods = [20, 30, 40, 50, 60, 70, 80, 90];
const periodOptions = demaPeriods.map((p) => ({
  value: p,
  label: p.toString(),
}));

export const getInput = async () => {
  intro('Please select the DEMA time periods you want to use');
  const groupResults = await group(
    {
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

  return groupResults as { period1: number; period2: number; period3: number };
};
