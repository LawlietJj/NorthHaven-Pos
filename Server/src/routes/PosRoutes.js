const express = require("express");
const { body, validationResult } = require("express-validator");

const { lookupByBarcode, checkout, getTransactionReceipt } = require("../controllers/pointOfSalecontroller");
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
router.get(
  "/products/by-barcode/:barcode",
  requireAuth,
  requireRole("owner", "manager", "cashier"),
  lookupByBarcode
);

router.post(
  "/checkout",
  requireAuth,
  requireRole("owner", "manager", "cashier"),
  [
    body("items").isArray({ min: 1 }).withMessage("Cart must contain at least one item."),
    body("items.*.product_id").isInt().withMessage("Each item needs a valid product_id."),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Each item needs a quantity of at least 1."),
    body("payment.method").isString().notEmpty().withMessage("Payment method is required."),
    body("payment.amount_tendered").isFloat({ min: 0 }).withMessage("A valid amount_tendered is required."),
  ],
  validate,
  checkout
);

router.get(
  "/transactions/:id",
  requireAuth,
  requireRole("owner", "manager", "cashier"),
  getTransactionReceipt
);

module.exports = router;