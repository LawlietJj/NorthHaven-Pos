const express = require("express");
const { body, validationResult } = require("express-validator");

const {
  createPurchaseBatch,
  listPurchaseBatches,
  createStockAdjustment,
  listStockMovements,
} = require("../controllers/stockController");
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


router.post(
  "/purchase-batches",
  requireAuth,
  requireRole("owner"),
  [
    body("shop_id").isInt().withMessage("A valid shop_id is required."),
    body("product_id").isInt().withMessage("A valid product_id is required."),
    body("quantity").isInt({ min: 1 }).withMessage("Quantity must be a positive integer."),
    body("total_cost").isFloat({ min: 0 }).withMessage("A valid total_cost is required."),
  ],
  validate,
  createPurchaseBatch
);

router.get("/purchase-batches", requireAuth, requireRole("owner"), listPurchaseBatches);


router.post(
  "/stock-adjustments",
  requireAuth,
  requireRole("owner", "manager"),
  [
    body("shop_id").isInt().withMessage("A valid shop_id is required."),
    body("product_id").isInt().withMessage("A valid product_id is required."),
    body("quantity").isInt().withMessage("Quantity must be a non-zero integer (e.g. 5 or -2)."),
    body("reason").optional().isString(),
  ],
  validate,
  createStockAdjustment
);

router.get("/stock-movements", requireAuth, requireRole("owner", "manager"), listStockMovements);

module.exports = router;