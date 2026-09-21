const express = require("express");
const { body, validationResult } = require("express-validator");

const {  salesSummary, lowStock, stockValue, shopComparison, salesLog, paymentBreakdown, revenueTrend, profitMargins, netProfit  } = require("../controllers/reportsController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");


const router = express.Router();

router.get("/sales-summary", requireAuth, requireRole("owner", "manager"), salesSummary);
router.get("/low-stock", requireAuth, requireRole("owner", "manager"), lowStock);
router.get("/sales-log", requireAuth, requireRole("owner", "manager", "cashier"), salesLog);
router.get("/stock-value", requireAuth, requireRole("owner", "manager"), stockValue);
router.get("/payment-breakdown", requireAuth, requireRole("owner", "manager"), paymentBreakdown);
router.get("/revenue-trend", requireAuth, requireRole("owner", "manager"), revenueTrend);
router.get("/profit-margins", requireAuth, requireRole("owner"), profitMargins);
router.get("/net-profit", requireAuth, requireRole("owner"), netProfit);

// Owner ONLY — cross-shop comparison is Owner's exclusive view by design.
router.get("/shop-comparison", requireAuth, requireRole("owner"), shopComparison);

module.exports = router;