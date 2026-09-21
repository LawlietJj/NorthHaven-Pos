const express = require("express");

const { ownerOverview, managerOverview, getActivityLog } = require("../controllers/dashboardController");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");

const router = express.Router();

router.get("/owner-overview", requireAuth, requireRole("owner"), ownerOverview);
router.get("/manager-overview", requireAuth, requireRole("owner", "manager"), managerOverview);
router.get("/activity-log", requireAuth, requireRole("owner"), getActivityLog);

module.exports = router;