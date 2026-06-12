const { z } = require('zod');
const prisma = require('../utils/prisma');

const createGroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
});

const addMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
});

exports.getGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Find all groups the user is a member of
    const groupMemberships = await prisma.groupMember.findMany({
      where: { user_id: userId },
      include: {
        group: {
          include: {
            _count: {
              select: { members: true }
            }
          }
        }
      },
      orderBy: { joined_at: 'desc' }
    });

    const groups = groupMemberships.map(m => ({
      id: m.group.id,
      name: m.group.name,
      memberCount: m.group._count.members,
      joinedAt: m.joined_at,
    }));

    res.json({ data: { groups } });
  } catch (error) {
    next(error);
  }
};

exports.createGroup = async (req, res, next) => {
  try {
    const validatedData = createGroupSchema.parse(req.body);
    const userId = req.user.id;

    // Create group and auto-add creator as member in a transaction
    const group = await prisma.$transaction(async (tx) => {
      const newGroup = await tx.group.create({
        data: {
          name: validatedData.name,
          created_by_id: userId,
        }
      });

      await tx.groupMember.create({
        data: {
          group_id: newGroup.id,
          user_id: userId,
        }
      });

      return newGroup;
    });

    res.status(201).json({ data: { group } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
};

exports.getGroupDetail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied. You are not a member of this group." });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        created_by: {
          select: { id: true, name: true, email: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { joined_at: 'asc' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: "Group not found" });
    }

    // Format response
    const groupData = {
      id: group.id,
      name: group.name,
      created_by: group.created_by,
      created_at: group.created_at,
      members: group.members.map(m => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        joined_at: m.joined_at
      }))
    };

    res.json({ data: { group: groupData } });
  } catch (error) {
    next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const validatedData = addMemberSchema.parse(req.body);

    // Verify current user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied. You are not a member of this group." });
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!userToAdd) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: userToAdd.id
        }
      }
    });

    if (existingMembership) {
      return res.status(400).json({ error: "User is already a member" });
    }

    // Add member
    const newMember = await prisma.groupMember.create({
      data: {
        group_id: id,
        user_id: userToAdd.id
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      data: {
        member: {
          id: newMember.user.id,
          name: newMember.user.name,
          email: newMember.user.email,
          joined_at: newMember.joined_at
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.user.id;

    // Verify current user is a member
    const membership = await prisma.groupMember.findUnique({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: currentUserId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: "Access denied. You are not a member of this group." });
    }

    // Remove member (allow even if unsettled, per requirements)
    // Note: historical expenses/splits are kept since they relate directly to User
    await prisma.groupMember.delete({
      where: {
        group_id_user_id: {
          group_id: id,
          user_id: targetUserId
        }
      }
    });

    res.json({ data: { success: true } });
  } catch (error) {
    // If the record doesn't exist, Prisma throws P2025. We can just ignore or return 404
    if (error.code === 'P2025') {
      return res.status(404).json({ error: "Member not found in this group" });
    }
    next(error);
  }
};
