const prisma = require("../utils/prismaClient");


async function listProducts(req, res, next) {
  try {
    const { shop_id, category_id } = req.query;

    const products = await prisma.products.findMany({
      where: {
        shop_id: shop_id ? Number(shop_id) : undefined,
        category_id: category_id ? Number(category_id) : undefined,
      },
      orderBy: [{ shop_id: "asc" }, { name: "asc" }],
    });

    // cost_price is NEVER returned to a Manager — only Owner sees it.
    const sanitized =
      req.user.role === "owner"
        ? products
        : products.map(({ cost_price, ...rest }) => rest);

    return res.status(200).json(sanitized);
  } catch (err) {
    next(err);
  }
}

async function createProduct(req, res, next) {
  try {
    const { shop_id, category_id, name, selling_price, low_stock_level, barcode, image_url, brand } = req.body;

    const category = await prisma.categories.findUnique({ where: { category_id: Number(category_id) } });
    if (!category) {
      return res.status(404).json({ error: "Category not found." });
    }
    if (category.shop_id !== Number(shop_id)) {
      return res.status(400).json({ error: "Category does not belong to this shop." });
    }

    const product = await prisma.products.create({
    data: {
      shop_id: Number(shop_id),
      category_id: Number(category_id),
      name,
      selling_price,
      low_stock_level: low_stock_level ?? 0,
      quantity: 0,
      cost_price: null,
      barcode: barcode ?? null,
      barcode_source: barcode ? "manufacturer" : null,
      image_url: image_url ?? null,
      brand: brand ?? null,
      created_by: req.user.user_id,
    },
  });

    const { cost_price, ...safeProduct } = product;
    return res.status(201).json(req.user.role === "owner" ? product : safeProduct);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "That barcode is already used by another product in this shop." });
    }
    next(err);
  }
}

async function updateProduct(req, res, next) {
  try {
    const productId = Number(req.params.id);
    const { name, category_id, selling_price, low_stock_level, image_url, brand } = req.body;

    const existing = await prisma.products.findUnique({ where: { product_id: productId } });
    if (!existing) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (category_id !== undefined) {
      const category = await prisma.categories.findUnique({ where: { category_id: Number(category_id) } });
      if (!category) {
        return res.status(404).json({ error: "Category not found." });
      }
      if (category.shop_id !== existing.shop_id) {
        return res.status(400).json({ error: "Category does not belong to this product's shop." });
      }
    }

    const updated = await prisma.products.update({
      where: { product_id: productId },
      data: {
        name: name ?? existing.name,
        category_id: category_id !== undefined ? Number(category_id) : existing.category_id,
        selling_price: selling_price ?? existing.selling_price,
        low_stock_level: low_stock_level ?? existing.low_stock_level,
        image_url: image_url !== undefined ? image_url : existing.image_url,
        brand: brand !== undefined ? brand : existing.brand,
      },
    });

    const { cost_price, ...safeProduct } = updated;
    return res.status(200).json(req.user.role === "owner" ? updated : safeProduct);
  } catch (err) {
    next(err);
  }
}

async function generateBarcode(req, res, next) {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.products.findUnique({
      where: { product_id: productId },
      include: { shops: true }, // to read shop_code
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    if (product.barcode) {
      // Idempotent — calling this again just returns the existing code,
      // rather than erroring or silently generating a second one.
      return res.status(200).json({ barcode: product.barcode, already_existed: true });
    }

    const barcode = `${product.shops.shop_code}-${String(product.product_id).padStart(5, "0")}`;

    const updated = await prisma.products.update({
      where: { product_id: productId },
      data: { barcode, barcode_source: "generated" },
    });

    return res.status(200).json({ barcode: updated.barcode, already_existed: false });
  } catch (err) {
    next(err);
  }
}


async function getProductById(req, res, next) {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.products.findUnique({ where: { product_id: productId } });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    const soldStats = await prisma.sale_items.aggregate({
      where: { product_id: productId },
      _sum: { quantity: true },
    });

    const saleItems = await prisma.sale_items.findMany({ where: { product_id: productId } });
    const totalRevenue = saleItems.reduce(
      (sum, item) => sum + Number(item.price_at_sale) * item.quantity,
      0
    );

    const stats = {
      total_sold: soldStats._sum.quantity || 0,
      total_revenue: totalRevenue,
    };

    const { cost_price, ...safeProduct } = product;
    const productData = req.user.role === "owner" ? product : safeProduct;

    return res.status(200).json({ ...productData, stats });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, createProduct, updateProduct, generateBarcode, getProductById };