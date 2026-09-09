const express = require("express");
const { body, validationResult } = require("express-validator");

const { createUser, listUsers, updateUser, deactivateUser, reactivateUser  } = require("../controllers/userController");

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
  "/",
  requireAuth,
  requireRole("owner"),
  [
    body("name").isString().notEmpty().withMessage("Name is required."),
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("password").isString().notEmpty().withMessage("Password is required."),
    body("role").isIn(["manager", "cashier"]).withMessage("role must be 'manager' or 'cashier'."),
  ],
  validate,
  createUser
);

router.get("/", requireAuth, requireRole("owner"), listUsers);

router.put(
  "/:id",
  requireAuth,
  requireRole("owner"),
  [
    body("name").optional().isString().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
  ],
  validate,
  updateUser
);

router.put("/:id/deactivate", requireAuth, requireRole("owner"), deactivateUser);
router.put("/:id/reactivate", requireAuth, requireRole("owner"), reactivateUser);

module.exports = router;