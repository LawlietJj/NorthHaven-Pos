const express = require("express");
const { body, validationResult } = require("express-validator");

const { login, changePassword } = require("../controllers/authController");
const { loginRateLimiter } = require("../middleware/rateLimiter");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

// Small helper so every route doesn't repeat this boilerplate.
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

router.post(
  "/login",
  loginRateLimiter,
  [
    body("email").isEmail().withMessage("A valid email is required.").normalizeEmail(),
    body("password").isString().notEmpty().withMessage("Password is required."),
  ],
  validate,
  login
);

// Owner-only: manual password reset for any staff member (confirmed flow —
// no self-service "forgot password" email, Owner handles it directly).
router.post(
  "/reset-password",
  requireAuth,
  requireRole("owner"),
  [
    body("user_id").isInt().withMessage("A valid user_id is required."),
    body("new_password").isString().notEmpty().withMessage("A new password is required."),
  ],
  validate,
  changePassword
);

module.exports = router;
