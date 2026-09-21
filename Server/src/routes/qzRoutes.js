const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { qzSignRateLimiter } = require("../middleware/rateLimiter");
const { getCertificate, signRequest } = require("../controllers/qzController");

const router = express.Router();

router.get("/certificate", requireAuth, getCertificate);
router.post("/sign", requireAuth, qzSignRateLimiter, express.text({ type: "text/plain" }), signRequest);

module.exports = router;
