const prisma = require("../utils/prismaClient");

async function createHeldCart(req, res, next) {
  try {
    const { items, label } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cannot hold an empty cart." });
    }
    const held = await prisma.held_carts.create({
      data: { held_by: req.user.user_id, label: label || null, items },
    });
    return res.status(201).json(held);
  } catch (err) {
    next(err);
  }
}

async function listHeldCarts(req, res, next) {
  try {
    const held = await prisma.held_carts.findMany({
      orderBy: { created_at: "desc" },
      include: { users: { select: { name: true } } },
    });
    const result = held.map((h) => ({
      held_cart_id: h.held_cart_id,
      label: h.label,
      item_count: Array.isArray(h.items) ? h.items.length : 0,
      held_by_name: h.users.name,
      created_at: h.created_at,
    }));
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getHeldCart(req, res, next) {
  try {
    const held = await prisma.held_carts.findUnique({
      where: { held_cart_id: Number(req.params.id) },
    });
    if (!held) return res.status(404).json({ error: "Held cart not found." });
    return res.status(200).json(held);
  } catch (err) {
    next(err);
  }
}

async function deleteHeldCart(req, res, next) {
  try {
    await prisma.held_carts.delete({ where: { held_cart_id: Number(req.params.id) } });
    return res.status(200).json({ message: "Held cart removed." });
  } catch (err) {
    next(err);
  }
}

module.exports = { createHeldCart, listHeldCarts, getHeldCart, deleteHeldCart };