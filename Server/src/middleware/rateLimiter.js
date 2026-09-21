const rateLimit = require("express-rate-limit");

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in a few minutes." },
});

const checkoutRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please slow down." },
});

const sensitiveActionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // generous — this is a safety net, not the main defense
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

// POST /qz/sign signs whatever text it's given with the printer certificate's
// private key — any authenticated role needs it (everyone prints receipts/
// labels), so it can't be role-gated, but an unlimited signing oracle is
// still worth bounding. Generous enough for a busy shift's worth of prints.
const qzSignRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many print signing requests. Please slow down." },
});

module.exports = {
  loginRateLimiter,
  checkoutRateLimiter,
  sensitiveActionRateLimiter,
  globalRateLimiter,
  qzSignRateLimiter,
};
