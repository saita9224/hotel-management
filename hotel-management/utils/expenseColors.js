export const getExpenseStatusColor = (expense, colors) => {
  if (expense.is_fully_paid) {
    return "#22c55e"; // paid
  }

  if (expense.amount_paid > 0) {
    return "#f59e0b"; // partial
  }

  return "#ef4444"; // unpaid
};