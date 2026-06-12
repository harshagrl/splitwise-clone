const simplifyDebts = (balances) => {
  // balances is an object like { 'userIdA': 50, 'userIdB': -20, 'userIdC': -30 }
  // Positive means they are owed money (creditor). Negative means they owe money (debtor).

  const debtors = [];
  const creditors = [];

  for (const [userId, amount] of Object.entries(balances)) {
    if (amount < -0.01) {
      debtors.push({ userId, amount: Math.abs(amount) });
    } else if (amount > 0.01) {
      creditors.push({ userId, amount });
    }
  }

  // Sort by amount descending
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const simplified = [];

  let i = 0; // debtor index
  let j = 0; // creditor index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const amount = Math.min(debtor.amount, creditor.amount);

    simplified.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Number(amount.toFixed(2))
    });

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (Math.abs(debtor.amount) < 0.01) {
      i++;
    }
    if (Math.abs(creditor.amount) < 0.01) {
      j++;
    }
  }

  return simplified;
};

const calculateGroupBalances = (expenses, splits, settlements) => {
  const balances = {}; // userId -> net balance

  // 1. Add what they paid
  for (const expense of expenses) {
    const paidBy = expense.paid_by_id;
    balances[paidBy] = (balances[paidBy] || 0) + Number(expense.amount);
  }

  // 2. Subtract what they owe
  for (const split of splits) {
    const user = split.user_id;
    balances[user] = (balances[user] || 0) - Number(split.amount);
  }

  // 3. Adjust for settlements
  for (const settlement of settlements) {
    const paidBy = settlement.paid_by_id;
    const paidTo = settlement.paid_to_id;
    const amount = Number(settlement.amount);

    balances[paidBy] = (balances[paidBy] || 0) + amount; // payer balance increases
    balances[paidTo] = (balances[paidTo] || 0) - amount; // payee balance decreases
  }

  // Ensure 2 decimal places
  for (const user in balances) {
    balances[user] = Number(balances[user].toFixed(2));
  }

  return balances;
};

module.exports = { simplifyDebts, calculateGroupBalances };
