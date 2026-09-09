const express = require("express");
const { body, validationResult } = require("express-validator");

const { listProducts, createProduct, updateProduct, generateBarcode, getProductById } = require("../controllers/productController");

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

router.get("/", requireAuth, requireRole("owner", "manager", "cashier"), listProducts);

router.post(
  "/",
  requireAuth,
  requireRole("owner", "manager"),
  [
    body("shop_id").isInt().withMessage("A valid shop_id is required."),
    body("category_id").isInt().withMessage("A valid category_id is required."),
    body("name").isString().notEmpty().withMessage("Product name is required."),
    body("selling_price").isFloat({ min: 0 }).withMessage("A valid selling_price is required."),
    body("low_stock_level").optional().isInt({ min: 0 }),
    body("barcode").optional({ nullable: true }).isString(),
    body("image_url").optional({ nullable: true }).isString(),
    body("brand").optional({ nullable: true }).isString(),
  ],
  validate,
  createProduct
);

router.put(
  "/:id",
  requireAuth,
  requireRole("owner", "manager"),
  [
    body("name").optional().isString().notEmpty(),
    body("category_id").optional().isInt(),
    body("selling_price").optional().isFloat({ min: 0 }),
    body("low_stock_level").optional().isInt({ min: 0 }),
    body("image_url").optional({ nullable: true }).isString(),
    body("brand").optional({ nullable: true }).isString(),
  ],
  validate,
  updateProduct
);

router.get("/:id", requireAuth, requireRole("owner", "manager", "cashier"), getProductById);

router.post("/:id/generate-barcode", requireAuth, requireRole("owner", "manager"), generateBarcode);

module.exports = router;