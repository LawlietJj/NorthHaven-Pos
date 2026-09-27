-- Lets Managers record purchase batches (restock with cost), not just the Owner.
--
-- The trigger trg_purchase_batches_owner_only rejected any purchase_batches
-- insert whose recorded_by user was not the Owner. The API route now allows
-- owner + manager (requireRole in stockRoutes.js), so the trigger is removed.
-- Managers still cannot read cost_price — that is hidden in the API.
--
-- Run once on each database (local and Hostinger phpMyAdmin).
-- To see whether the trigger exists first:
--   SHOW TRIGGERS WHERE `Trigger` = 'trg_purchase_batches_owner_only';

DROP TRIGGER IF EXISTS trg_purchase_batches_owner_only;
