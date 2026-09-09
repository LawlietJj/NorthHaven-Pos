const express = require("express");
const { body, validationResult } = require("express-validator");

const { listCategories, createCategory, updateCategory, deleteCategory } = require("../controllers/categoryController");

const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

router.get("/", requireAuth, requireRole("owner", "manager"), listCategories);

router.post(
  "/",
  requireAuth,
  requireRole("owner", "manager"),
  [
    body("shop_id").isInt().withMessage("A valid shop_id is required."),
    body("name").isString().notEmpty().withMessage("Category name is required."),
    body("parent_category_id").optional({ nullable: true }).isInt(),
    body("description").optional({ nullable: true }).isString(),
  ],
  validate,
  createCategory
);

router.put(
  "/:id",
  requireAuth,
  requireRole("owner", "manager"),
  [
    body("name").optional().isString().notEmpty(),
    body("description").optional({ nullable: true }).isString(),
  ],
  validate,
  updateCategory
);

router.delete("/:id", requireAuth, requireRole("owner", "manager"), deleteCategory);

module.exports = router;