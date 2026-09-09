const prisma = require("../utils/prismaClient");

async function listCategories(req, res, next) {
  try {
    const { shop_id } = req.query;

    const categories = await prisma.categories.findMany({
      where: shop_id ? { shop_id: Number(shop_id) } : undefined,
      orderBy: [{ shop_id: "asc" }, { parent_category_id: "asc" }, { name: "asc" }],
    });

    return res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { shop_id, parent_category_id, name, description } = req.body;

    
    const isTopLevel = parent_category_id === undefined || parent_category_id === null;
    if (isTopLevel && req.user.role !== "owner") {
      return res.status(403).json({ error: "Only the Business Owner can create a top-level category." });
    }

    if (!isTopLevel) {
      const parent = await prisma.categories.findUnique({ where: { category_id: Number(parent_category_id) } });
      if (!parent) {
        return res.status(404).json({ error: "Parent category not found." });
      }
      if (parent.parent_category_id !== null) {
        // Mirrors the DB trigger's max-depth rule, with a clearer message.
        return res.status(400).json({ error: "Categories can only nest 1 level deep — that category is already a subcategory." });
      }
      if (parent.shop_id !== Number(shop_id)) {
        return res.status(400).json({ error: "Parent category belongs to a different shop." });
      }
    }

    const category = await prisma.categories.create({
      data: {
        shop_id: Number(shop_id),
        parent_category_id: isTopLevel ? null : Number(parent_category_id),
        name,
        description: description ?? null,
        created_by: req.user.user_id,
      },
    });

    return res.status(201).json(category);
  } catch (err) {
    // Catches the DB-level UNIQUE(shop_id, name) violation if it slips past
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A category with that name already exists in this shop." });
    }
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.id);
    const { name, description } = req.body;

    const existing = await prisma.categories.findUnique({ where: { category_id: categoryId } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found." });
    }

    const updated = await prisma.categories.update({
      where: { category_id: categoryId },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
      },
    });

    return res.status(200).json(updated);
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A category with that name already exists in this shop." });
    }
    next(err);
  }
}

async function deleteCategory(req, res, next) {
  try {
    const categoryId = Number(req.params.id);

    const existing = await prisma.categories.findUnique({ where: { category_id: categoryId } });
    if (!existing) {
      return res.status(404).json({ error: "Category not found." });
    }

    const productCount = await prisma.products.count({ where: { category_id: categoryId } });
    if (productCount > 0) {
      return res.status(409).json({
        error: `Cannot delete — ${productCount} product(s) are using this category. Reassign or delete them first.`,
      });
    }

    const subcategoryCount = await prisma.categories.count({ where: { parent_category_id: categoryId } });
    if (subcategoryCount > 0) {
      return res.status(409).json({
        error: `Cannot delete — this category has ${subcategoryCount} subcategory(ies). Delete those first.`,
      });
    }

    await prisma.categories.delete({ where: { category_id: categoryId } });
    return res.status(200).json({ message: "Category deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };