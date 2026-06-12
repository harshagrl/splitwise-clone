const calculateSplits = (totalAmount, splitType, selectedMembers, splitValues) => {
  const splits = [];
  const amount = Number(totalAmount);
  const count = selectedMembers.length;

  if (count === 0) {
    throw new Error("At least one member must be selected for the split.");
  }

  if (splitType === 'EQUAL') {
    // Equal split: distribute amount evenly, assign any remainder to the first member
    const baseShare = Math.floor((amount / count) * 100) / 100;
    let remainder = Math.round((amount - baseShare * count) * 100) / 100;

    for (let i = 0; i < count; i++) {
      let share = baseShare;
      if (i === 0) {
        share = Number((share + remainder).toFixed(2));
      }
      splits.push({
        userId: selectedMembers[i],
        amount: share
      });
    }
  } else if (splitType === 'EXACT') {
    // Exact split: validate that the sum of exact amounts equals the total
    let sum = 0;
    for (const member of selectedMembers) {
      const val = Number(splitValues[member]);
      if (isNaN(val) || val < 0) {
        throw new Error(`Invalid exact amount for user ${member}`);
      }
      sum += val;
      splits.push({
        userId: member,
        amount: Number(val.toFixed(2))
      });
    }

    if (Math.abs(sum - amount) > 0.01) {
      throw new Error(`Sum of exact amounts (${sum}) does not equal total amount (${amount})`);
    }
  } else if (splitType === 'PERCENTAGE') {
    // Percentage split: validate that the sum of percentages equals 100%
    let percentSum = 0;
    for (const member of selectedMembers) {
      const val = Number(splitValues[member]);
      if (isNaN(val) || val < 0) {
        throw new Error(`Invalid percentage for user ${member}`);
      }
      percentSum += val;
    }

    if (Math.abs(percentSum - 100) > 0.01) {
      throw new Error(`Sum of percentages (${percentSum}%) does not equal 100%`);
    }

    let calculatedSum = 0;
    for (let i = 0; i < count; i++) {
      const member = selectedMembers[i];
      const val = Number(splitValues[member]);
      let share = Math.floor((amount * (val / 100)) * 100) / 100;
      calculatedSum += share;
      splits.push({
        userId: member,
        amount: share
      });
    }

    let remainder = Math.round((amount - calculatedSum) * 100) / 100;
    if (remainder !== 0) {
      splits[0].amount = Number((splits[0].amount + remainder).toFixed(2));
    }
  } else if (splitType === 'SHARES') {
    // Shares split: divide proportionally by shares
    let totalShares = 0;
    for (const member of selectedMembers) {
      const val = Number(splitValues[member]);
      if (isNaN(val) || val < 0) {
        throw new Error(`Invalid shares for user ${member}`);
      }
      totalShares += val;
    }

    if (totalShares === 0) {
      throw new Error("Total shares must be greater than 0");
    }

    let calculatedSum = 0;
    for (let i = 0; i < count; i++) {
      const member = selectedMembers[i];
      const val = Number(splitValues[member]);
      let share = Math.floor((amount * (val / totalShares)) * 100) / 100;
      calculatedSum += share;
      splits.push({
        userId: member,
        amount: share
      });
    }

    let remainder = Math.round((amount - calculatedSum) * 100) / 100;
    if (remainder !== 0) {
      splits[0].amount = Number((splits[0].amount + remainder).toFixed(2));
    }
  } else {
    throw new Error("Invalid split type");
  }

  return splits;
};

module.exports = calculateSplits;
