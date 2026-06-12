const { z } = require('zod');
const prisma = require('../utils/prisma');

const createMessageSchema = z.object({
  content: z.string().min(1, "Message content is required"),
});

exports.createMessage = async (req, res, next) => {
  try {
    const { id: expenseId } = req.params;
    const userId = req.user.id;
    const validatedData = createMessageSchema.parse(req.body);

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Verify membership in the group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: expense.group_id, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const message = await prisma.chatMessage.create({
      data: {
        expense_id: expenseId,
        user_id: userId,
        content: validatedData.content,
      },
      include: {
        user: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ data: { message } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { id: expenseId } = req.params;
    const userId = req.user.id;

    const expense = await prisma.expense.findUnique({
      where: { id: expenseId }
    });

    if (!expense) return res.status(404).json({ error: "Expense not found" });

    // Verify membership in the group
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: expense.group_id, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const messages = await prisma.chatMessage.findMany({
      where: { expense_id: expenseId },
      include: {
        user: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'asc' }
    });

    res.json({ data: { messages } });
  } catch (error) {
    next(error);
  }
};
