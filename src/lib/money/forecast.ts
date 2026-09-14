export type Forecast = {
  spentMinor: number;
  paceMinor: number;
  committedMinor: number;
  projectedExpenseMinor: number;
  projectedNetMinor: number;
  daysLeft: number;
};

export function forecast(input: {
  expenseMinor: number;
  incomeMinor: number;
  daysElapsed: number;
  daysInMonth: number;
  committedMinor: number;
}): Forecast {
  const { expenseMinor, incomeMinor, daysElapsed, daysInMonth, committedMinor } = input;
  const daysLeft = Math.max(daysInMonth - daysElapsed, 0);
  const paceMinor = daysElapsed > 0 ? Math.round((expenseMinor / daysElapsed) * daysLeft) : 0;
  const projectedExpenseMinor = expenseMinor + paceMinor + committedMinor;

  return {
    spentMinor: expenseMinor,
    paceMinor,
    committedMinor,
    projectedExpenseMinor,
    projectedNetMinor: incomeMinor - projectedExpenseMinor,
    daysLeft,
  };
}
