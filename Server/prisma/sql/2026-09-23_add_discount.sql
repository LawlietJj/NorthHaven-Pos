-- Adds a per-sale discount (a fixed Naira amount typed at the till).
--
-- transactions.total_amount and sales.subtotal keep meaning "what was actually
-- collected" (after discount), so every revenue report stays correct.
-- The full price before discount = total_amount + discount_amount.
--
-- Run once on each database (local and Hostinger phpMyAdmin). Existing sales
-- get discount_amount = 0.00, so nothing about past sales changes.

ALTER TABLE transactions
  ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER total_amount;

ALTER TABLE sales
  ADD COLUMN discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER subtotal;
