const { z } = require('zod');
const prisma = require('../utils/prisma');
const calculateSplits = require('../utils/splitCalculator');
const { simplifyDebts, calculateGroupBalances } = require('../utils/balanceCalc');

const createExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.number().positive("Amount must be positive"),
  paid_by_id: z.string().uuid("Invalid payer ID"),
  split_type: z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']),
  selected_members: z.array(z.string().uuid()).min(1, "At least one member must be selected"),
  split_values: z.record(z.union([z.number(), z.string()])).optional(), // member_id -> value
});

exports.createExpense = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;
    const validatedData = createExpenseSchema.parse(req.body);

    // Verify user is in group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    // Verify paid_by user is in group
    const payerMembership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: validatedData.paid_by_id } }
    });
    if (!payerMembership) return res.status(400).json({ error: "Payer is not in the group" });

    // Verify all selected members are in the group
    for (const memberId of validatedData.selected_members) {
      const m = await prisma.groupMember.findUnique({
        where: { group_id_user_id: { group_id: groupId, user_id: memberId } }
      });
      if (!m) return res.status(400).json({ error: `User ${memberId} is not in the group` });
    }

    // Calculate splits
    const splits = calculateSplits(
      validatedData.amount,
      validatedData.split_type,
      validatedData.selected_members,
      validatedData.split_values || {}
    );

    // Create expense and splits in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          group_id: groupId,
          paid_by_id: validatedData.paid_by_id,
          description: validatedData.description,
          amount: validatedData.amount,
          split_type: validatedData.split_type,
        }
      });

      await tx.expenseSplit.createMany({
        data: splits.map(split => ({
          expense_id: newExpense.id,
          user_id: split.userId,
          amount: split.amount,
        }))
      });

      return newExpense;
    });

    res.status(201).json({ data: { expense } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    if (error.message.includes('Sum of') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
};

exports.getGroupExpenses = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const expenses = await prisma.expense.findMany({
      where: { group_id: groupId },
      include: {
        paid_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ data: { expenses } });
  } catch (error) {
    next(error);
  }
};

exports.getExpenseDetail = async (req, res, next) => {
  try {
    const { id: expenseId } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        paid_by: { select: { id: true, name: true } },
        splits: {
          include: { user: { select: { id: true, name: true } } }
        }
      }
    });

    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Verify membership in the group this expense belongs to
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: expense.group_id, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    res.json({ data: { expense } });
  } catch (error) {
    next(error);
  }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const { id: expenseId } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: expense.group_id, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    // Prisma handles cascading deletes for splits and messages
    await prisma.expense.delete({
      where: { id: expenseId }
    });

    res.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
};

exports.getGroupBalances = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const expenses = await prisma.expense.findMany({ where: { group_id: groupId } });
    const splits = await prisma.expenseSplit.findMany({
      where: { expense: { group_id: groupId } }
    });
    const settlements = await prisma.settlement.findMany({ where: { group_id: groupId } });

    const balances = calculateGroupBalances(expenses, splits, settlements);
    const simplifiedDebts = simplifyDebts(balances);

    // Get user details for formatting
    const groupMembers = await prisma.groupMember.findMany({
      where: { group_id: groupId },
      include: { user: { select: { id: true, name: true } } }
    });

    const userMap = {};
    for (const m of groupMembers) {
      userMap[m.user.id] = m.user.name;
    }

    const formattedDebts = simplifiedDebts.map(debt => ({
      from: debt.from,
      fromName: userMap[debt.from] || 'Unknown',
      to: debt.to,
      toName: userMap[debt.to] || 'Unknown',
      amount: debt.amount
    }));

    res.json({
      data: {
        balances,
        simplifiedDebts: formattedDebts,
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOverallBalances = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const memberships = await prisma.groupMember.findMany({
      where: { user_id: userId },
      include: { group: true }
    });

    let totalBalance = 0;
    const perGroup = [];

    for (const m of memberships) {
      const groupId = m.group_id;
      const expenses = await prisma.expense.findMany({ where: { group_id: groupId } });
      const splits = await prisma.expenseSplit.findMany({
        where: { expense: { group_id: groupId } }
      });
      const settlements = await prisma.settlement.findMany({ where: { group_id: groupId } });

      const balances = calculateGroupBalances(expenses, splits, settlements);
      const userBalance = balances[userId] || 0;
      
      totalBalance += userBalance;
      perGroup.push({
        groupId: groupId,
        groupName: m.group.name,
        balance: userBalance
      });
    }

    res.json({
      data: {
        totalBalance: Number(totalBalance.toFixed(2)),
        perGroup
      }
    });
  } catch (error) {
    next(error);
  }
};
