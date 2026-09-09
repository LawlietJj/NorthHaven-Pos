const express = require("express");
const { body, validationResult } = require("express-validator");

const { listShops, updateShop, deactivateShop, reactivateShop } = require("../controllers/shopControllers");  

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

router.get("/", requireAuth, requireRole("owner", "manager"), listShops);

router.put(
  "/:id",
  requireAuth,
  requireRole("owner"),
  [
    body("shop_name").optional().isString().notEmpty(),
    body("address").optional().isString(),
    body("phone").optional().isString(),
  ],
  validate,
  updateShop
);

router.put("/:id/deactivate", requireAuth, requireRole("owner"), deactivateShop);
router.put("/:id/reactivate", requireAuth, requireRole("owner"), reactivateShop);

module.exports = router;