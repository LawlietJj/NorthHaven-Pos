const prisma = require("../utils/prismaClient");

async function lookupByBarcode(req, res, next) {
  try {
    const { barcode } = req.params;

    const matches = await prisma.products.findMany({
      where: { barcode },
      select: {
        product_id: true,
        shop_id: true,
        name: true,
        selling_price: true,
        quantity: true,
        shops: { select: { shop_code: true, shop_name: true } },
      },
    });

    if (matches.length === 0) {
      return res.status(404).json({ error: "No product found with that barcode." });
    }

    return res.status(200).json({ matches });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /checkout
 * Body: { items: [{ product_id, quantity }], payment: { method, amount_tendered } }
 *
 * This is the core POS transaction. Everything happens in ONE Prisma
 * transaction: stock is re-checked and deducted, transactions/sales/
 * sale_items/payments/stock_movements are all written together, or
 * nothing is written at all if any step fails (e.g. insufficient stock).
 */
async function checkout(req, res, next) {
  try {
    const { items, payment } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Cart cannot be empty." });
    }
    if (!payment || !payment.method || payment.amount_tendered === undefined) {
      return res.status(400).json({ error: "Payment method and amount_tendered are required." });
    }

    const result = await prisma.$transaction(async (tx) => {
      const productIds = items.map((i) => Number(i.product_id));
      const products = await tx.products.findMany({ where: { product_id: { in: productIds } } });

      const productMap = new Map(products.map((p) => [p.product_id, p]));

      for (const item of items) {
        const product = productMap.get(Number(item.product_id));
        if (!product) {
          throw Object.assign(new Error(`Product ${item.product_id} not found.`), { status: 404 });
        }
        if (product.quantity < item.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for "${product.name}" — only ${product.quantity} left.`),
            { status: 409 }
          );
        }
      }

      const itemsByShop = new Map();
      for (const item of items) {
        const product = productMap.get(Number(item.product_id));
        if (!itemsByShop.has(product.shop_id)) itemsByShop.set(product.shop_id, []);
        itemsByShop.get(product.shop_id).push({ item, product });
      }

      let totalAmount = 0;
      for (const [, shopItems] of itemsByShop) {
        for (const { item, product } of shopItems) {
          totalAmount += Number(product.selling_price) * item.quantity;
        }
      }

      if (Number(payment.amount_tendered) < totalAmount) {
        throw Object.assign(
          new Error(`Amount tendered (${payment.amount_tendered}) is less than total (${totalAmount}).`),
          { status: 400 }
        );
      }

      const transaction = await tx.transactions.create({
        data: { cashier_id: req.user.user_id, total_amount: totalAmount },
      });

      const salesBreakdown = [];

      for (const [shopId, shopItems] of itemsByShop) {
        const subtotal = shopItems.reduce(
          (sum, { item, product }) => sum + Number(product.selling_price) * item.quantity,
          0
        );

        const sale = await tx.sales.create({
          data: { transaction_id: transaction.transaction_id, shop_id: shopId, subtotal },
        });

        const saleItemsCreated = [];
        for (const { item, product } of shopItems) {
          const saleItem = await tx.sale_items.create({
            data: {
              sale_id: sale.sale_id,
              product_id: product.product_id,
              quantity: item.quantity,
              price_at_sale: product.selling_price,
            },
          });
          saleItemsCreated.push({ ...saleItem, product_name: product.name });

          await tx.products.update({
            where: { product_id: product.product_id },
            data: { quantity: { decrement: item.quantity } },
          });

          await tx.stock_movements.create({
            data: {
              shop_id: shopId,
              product_id: product.product_id,
              user_id: req.user.user_id,
              quantity: -item.quantity,
              movement_type: "SALE",
              reference: `sale:${sale.sale_id}`,
            },
          });
        }

        salesBreakdown.push({ sale_id: sale.sale_id, shop_id: shopId, subtotal, items: saleItemsCreated });
      }

      const changeGiven = Number(payment.amount_tendered) - totalAmount;
      const paymentRecord = await tx.payments.create({
        data: {
          transaction_id: transaction.transaction_id,
          method: payment.method,
          amount_tendered: payment.amount_tendered,
          change_given: changeGiven,
        },
      });

      return { transaction, salesBreakdown, payment: paymentRecord };
    });

    return res.status(201).json({
      transaction_id: result.transaction.transaction_id,
      total_amount: result.transaction.total_amount,
      sales: result.salesBreakdown,
      payment: result.payment,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
}

async function getTransactionReceipt(req, res, next) {
  try {
    const transactionId = Number(req.params.id);

    const transaction = await prisma.transactions.findUnique({
      where: { transaction_id: transactionId },
      include: {
        payments: true,
        sales: {
          include: {
            shops: { select: { shop_code: true } },
            sale_items: { include: { products: { select: { name: true } } } },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." });
    }

    return res.status(200).json(transaction);
  } catch (err) {
    next(err);
  }
}

module.exports = { lookupByBarcode, checkout, getTransactionReceipt };