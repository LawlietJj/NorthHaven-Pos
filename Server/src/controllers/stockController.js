const prisma = require("../utils/prismaClient");
const { logActivity } = require("../utils/activityLogger");


async function createPurchaseBatch(req, res, next) {
  try {
    const { shop_id, product_id, quantity, total_cost } = req.body;

    const product = await prisma.products.findUnique({ where: { product_id: Number(product_id) } });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.shop_id !== Number(shop_id)) {
      return res.status(400).json({ error: "Product does not belong to this shop." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.purchase_batches.create({
        data: {
          shop_id: Number(shop_id),
          product_id: Number(product_id),
          quantity: Number(quantity),
          total_cost: Number(total_cost),
          recorded_by: req.user.user_id,
        },
      });

      const unitCost = Number(total_cost) / Number(quantity);

      const updatedProduct = await tx.products.update({
        where: { product_id: Number(product_id) },
        data: {
          quantity: { increment: Number(quantity) },
          cost_price: unitCost, 
        },
      });

      await tx.stock_movements.create({
        data: {
          shop_id: Number(shop_id),
          product_id: Number(product_id),
          user_id: req.user.user_id,
          quantity: Number(quantity), 
          movement_type: "STOCK_IN",
          reference: `batch:${batch.batch_id}`,
        },
      });

      return { batch, updatedProduct };
    });

    await logActivity(req.user.user_id, "RESTOCK", `Product #${product_id}, qty ${quantity}, cost ₦${total_cost}`);

    // Managers can record purchases, but cost_price is still Owner-only to read.
    return res.status(201).json({
      batch: result.batch,
      new_quantity: result.updatedProduct.quantity,
      ...(req.user.role === "owner" && { new_cost_price: result.updatedProduct.cost_price }),
    });
  } catch (err) {
    // The DB trigger (trg_purchase_batches_owner_only) is the real backstop —
    // this just gives a cleaner message if it somehow gets hit.
    if (err.message && err.message.includes("Only the Business Owner")) {
      return res.status(403).json({ error: "Only the Owner or a Manager can record a purchase batch." });
    }
    next(err);
  }
}

/**
 * GET /purchase-batches — Owner ONLY.
 * This is where real cost history lives — 
 */
function mapBatch(batch) {
  return { ...batch, product_name: batch.products.name, products: undefined };
}

async function listPurchaseBatches(req, res, next) {
  try {
    const { shop_id, product_id, page, limit } = req.query;

    const where = {
      shop_id: shop_id ? Number(shop_id) : undefined,
      product_id: product_id ? Number(product_id) : undefined,
    };
    const orderBy = { created_at: "desc" };
    const include = { products: { select: { name: true } } };

    // Pagination is opt-in — only applies when page/limit is explicitly requested.
    const paginate = page !== undefined || limit !== undefined;

    if (!paginate) {
      const batches = await prisma.purchase_batches.findMany({ where, orderBy, include });
      return res.status(200).json(batches.map(mapBatch));
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [batches, total] = await Promise.all([
      prisma.purchase_batches.findMany({ where, orderBy, include, skip, take: limitNum }),
      prisma.purchase_batches.count({ where }),
    ]);

    return res.status(200).json({
      data: batches.map(mapBatch),
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    next(err);
  }
}

async function createStockAdjustment(req, res, next) {
  try {
    const { shop_id, product_id, quantity, reason } = req.body;
    const delta = Number(quantity);

    const product = await prisma.products.findUnique({ where: { product_id: Number(product_id) } });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    if (product.shop_id !== Number(shop_id)) {
      return res.status(400).json({ error: "Product does not belong to this shop." });
    }

    const resultingQuantity = product.quantity + delta;
    if (resultingQuantity < 0) {
      return res.status(400).json({
        error: `This adjustment would result in negative stock (${resultingQuantity}). Current quantity is ${product.quantity}.`,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.products.update({
        where: { product_id: Number(product_id) },
        data: { quantity: { increment: delta } },
      });

      const movement = await tx.stock_movements.create({
        data: {
          shop_id: Number(shop_id),
          product_id: Number(product_id),
          user_id: req.user.user_id,
          quantity: delta,
          movement_type: "ADJUSTMENT",
          reference: reason ? reason.slice(0, 50) : null,
        },
      });

      return { updatedProduct, movement };
    });

    await logActivity(
      req.user.user_id,
      "STOCK_ADJUSTMENT",
      `Product #${product_id}, change ${delta}, reason: ${reason || "none given"}`
    );

    return res.status(201).json({
      new_quantity: result.updatedProduct.quantity,
      movement: result.movement,
    });
  } catch (err) {
    next(err);
  }
}

function mapMovement(movement) {
  return { ...movement, product_name: movement.products.name, products: undefined };
}

async function listStockMovements(req, res, next) {
  try {
    const { shop_id, product_id, page, limit } = req.query;

    const where = {
      shop_id: shop_id ? Number(shop_id) : undefined,
      product_id: product_id ? Number(product_id) : undefined,
    };
    const orderBy = { created_at: "desc" };
    const include = { products: { select: { name: true } } };

    // Pagination is opt-in — only applies when page/limit is explicitly requested.
    const paginate = page !== undefined || limit !== undefined;

    if (!paginate) {
      const movements = await prisma.stock_movements.findMany({ where, orderBy, include });
      return res.status(200).json(movements.map(mapMovement));
    }

    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [movements, total] = await Promise.all([
      prisma.stock_movements.findMany({ where, orderBy, include, skip, take: limitNum }),
      prisma.stock_movements.count({ where }),
    ]);

    return res.status(200).json({
      data: movements.map(mapMovement),
      total,
      page: pageNum,
      totalPages: Math.max(1, Math.ceil(total / limitNum)),
    });
  } catch (err) {
    next(err);
  }
}


module.exports = { createPurchaseBatch, listPurchaseBatches, createStockAdjustment, listStockMovements };