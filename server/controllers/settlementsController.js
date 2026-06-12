const { z } = require('zod');
const prisma = require('../utils/prisma');

const createSettlementSchema = z.object({
  paid_to_id: z.string().uuid("Invalid paid_to ID"),
  amount: z.number().positive("Amount must be positive"),
});

exports.createSettlement = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const paidById = req.user.id;
    const validatedData = createSettlementSchema.parse(req.body);

    // Verify payer is in group
    const payerMembership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: paidById } }
    });
    if (!payerMembership) return res.status(403).json({ error: "Access denied" });

    // Verify payee is in group
    const payeeMembership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: validatedData.paid_to_id } }
    });
    if (!payeeMembership) return res.status(400).json({ error: "Payee is not in the group" });

    if (paidById === validatedData.paid_to_id) {
      return res.status(400).json({ error: "Cannot settle with yourself" });
    }

    const settlement = await prisma.settlement.create({
      data: {
        group_id: groupId,
        paid_by_id: paidById,
        paid_to_id: validatedData.paid_to_id,
        amount: validatedData.amount,
      }
    });

    res.status(201).json({ data: { settlement } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
};

exports.getGroupSettlements = async (req, res, next) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { group_id_user_id: { group_id: groupId, user_id: userId } }
    });
    if (!membership) return res.status(403).json({ error: "Access denied" });

    const settlements = await prisma.settlement.findMany({
      where: { group_id: groupId },
      include: {
        paid_by: { select: { id: true, name: true } },
        paid_to: { select: { id: true, name: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ data: { settlements } });
  } catch (error) {
    next(error);
  }
};
