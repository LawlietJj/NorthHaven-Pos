const prisma = require("../utils/prismaClient");
const { hashPassword, validatePasswordStrength } = require("../utils/password");

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;

    if (!["manager", "cashier"].includes(role)) {
      return res.status(400).json({ error: "role must be 'manager' or 'cashier'." });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    const existing = await prisma.users.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "A user with that email already exists." });
    }

    const password_hash = await hashPassword(password);

    const user = await prisma.users.create({
      data: { name, email, password_hash, role, is_active: true },
    });

    const { password_hash: _omit, ...safeUser } = user;
    return res.status(201).json(safeUser);
  } catch (err) {
    next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const { page, limit } = req.query;
    const select = {
      user_id: true,
      name: true,
      email: true,
      role: true,
      is_active: true,
      created_at: true,
    };
    const orderBy = { user_id: "asc" };

    // Pagination is opt-in — only applies when page/limit is explicitly requested.
    const paginate = page !== undefined || limit !== undefined;

    if (!paginate) {
      const users = await prisma.users.findMany({ select, orderBy });
      return res.status(200).json(users);
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      prisma.users.findMany({ select, orderBy, skip, take: limitNum }),
      prisma.users.count(),
    ]);

    return res.status(200).json({
      data: users,
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const { name, email } = req.body;

    const existing = await prisma.users.findUnique({ where: { user_id: userId } });
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }

    const updated = await prisma.users.update({
      where: { user_id: userId },
      data: {
        name: name ?? existing.name,
        email: email ?? existing.email,
      },
    });

    const { password_hash: _omit, ...safeUser } = updated;
    return res.status(200).json(safeUser);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A user with that email already exists." });
    }
    next(err);
  }
}

async function setUserActiveStatus(req, res, next, isActive) {
  try {
    const userId = Number(req.params.id);

    const existing = await prisma.users.findUnique({ where: { user_id: userId } });
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }
    if (existing.role === "owner") {
      return res.status(403).json({ error: "The Owner account cannot be deactivated." });
    }

    const updated = await prisma.users.update({
      where: { user_id: userId },
      data: { is_active: isActive },
    });

    const { password_hash: _omit, ...safeUser } = updated;
    return res.status(200).json(safeUser);
  } catch (err) {
    next(err);
  }
}

async function deactivateUser(req, res, next) {
  return setUserActiveStatus(req, res, next, false);
}

async function reactivateUser(req, res, next) {
  return setUserActiveStatus(req, res, next, true);
}

module.exports = { createUser, listUsers, updateUser, deactivateUser, reactivateUser };