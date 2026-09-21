const express = require("express");
const { body, validationResult } = require("express-validator");

const { createHeldCart, listHeldCarts, getHeldCart, deleteHeldCart } = require("../controllers/heldCartController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

const allRoles = requireRole("owner", "manager", "cashier");

router.post(
  "/",
  requireAuth,
  allRoles,
  [
    body("items").isArray({ min: 1 }).withMessage("Cannot hold an empty cart."),
    body("items.*.product_id").isInt().withMessage("Each item needs a valid product_id."),
    body("items.*.quantity").isInt({ min: 1 }).withMessage("Each item needs a quantity of at least 1."),
  ],
  validate,
  createHeldCart
);
router.get("/", requireAuth, allRoles, listHeldCarts);
router.get("/:id", requireAuth, allRoles, getHeldCart);
router.delete("/:id", requireAuth, allRoles, deleteHeldCart);

module.exports = router;