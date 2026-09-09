const prisma = require("../utils/prismaClient");

async function listShops(req, res, next) {
  try {
    const shops = await prisma.shops.findMany({
      orderBy: { shop_id: "asc" },
    });
    return res.status(200).json(shops);
  } catch (err) {
    next(err);
  }
}

async function updateShop(req, res, next) {
  try {
    const shopId = Number(req.params.id);
    const { shop_name, address, phone } = req.body;

    const existing = await prisma.shops.findUnique({ where: { shop_id: shopId } });
    if (!existing) {
      return res.status(404).json({ error: "Shop not found." });
    }

    const updated = await prisma.shops.update({
      where: { shop_id: shopId },
      data: {
        shop_name: shop_name ?? existing.shop_name,
        address: address ?? existing.address,
        phone: phone ?? existing.phone,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

async function setShopActiveStatus(req, res, next, isActive) {
  try {
    const shopId = Number(req.params.id);

    const existing = await prisma.shops.findUnique({ where: { shop_id: shopId } });
    if (!existing) {
      return res.status(404).json({ error: "Shop not found." });
    }

    const updated = await prisma.shops.update({
      where: { shop_id: shopId },
      data: { is_active: isActive },
    });

    return res.status(200).json(updated);
  } catch (err) {
    next(err);
  }
}

async function deactivateShop(req, res, next) {
  return setShopActiveStatus(req, res, next, false);
}

async function reactivateShop(req, res, next) {
  return setShopActiveStatus(req, res, next, true);
}

module.exports = { listShops, updateShop, deactivateShop, reactivateShop };