-- NorthHaven POS starter data for MySQL/MariaDB (Hostinger phpMyAdmin).
-- Import only after creating the database tables from prisma/schema.prisma.
-- This is demo-only data: it adds clearly labeled synthetic sales for graph
-- previews. Do not import into a database that contains live business data.
-- Re-running preserves existing accounts, shops, categories, and products,
-- and uses activity-log markers to avoid duplicating demo sales.

START TRANSACTION;

INSERT INTO users (name, email, password_hash, role, shop_id, is_active)
VALUES (
  'Business Owner',
  'owner@example.com',
  '$2b$12$CoxoLQ1DRhg21gdz0J0n.uW2HUmxMm.w8rKbMWbnE1t781eqM9HX6',
  'owner',
  NULL,
  TRUE
)
ON DUPLICATE KEY UPDATE user_id = LAST_INSERT_ID(user_id);

SET @seed_owner_id = (
  SELECT user_id FROM users WHERE email = 'owner@example.com' LIMIT 1
);

INSERT INTO shops (shop_name, shop_code, is_active)
VALUES
  ('Exotic Kids Wears and More', 'S1', TRUE),
  ('Exotic Shoes and Bag', 'S2', TRUE)
ON DUPLICATE KEY UPDATE shop_id = LAST_INSERT_ID(shop_id);

SET @seed_shop_1 = (SELECT shop_id FROM shops WHERE shop_code = 'S1' LIMIT 1);
SET @seed_shop_2 = (SELECT shop_id FROM shops WHERE shop_code = 'S2' LIMIT 1);

INSERT INTO categories (shop_id, name, created_by)
VALUES
  (@seed_shop_1, 'Kids Clothing', @seed_owner_id),
  (@seed_shop_1, 'Footwear', @seed_owner_id),
  (@seed_shop_1, 'Accessories', @seed_owner_id),
  (@seed_shop_2, 'Handbags', @seed_owner_id),
  (@seed_shop_2, 'Footwear', @seed_owner_id),
  (@seed_shop_2, 'Travel Accessories', @seed_owner_id)
ON DUPLICATE KEY UPDATE category_id = LAST_INSERT_ID(category_id);

DROP TEMPORARY TABLE IF EXISTS tmp_northhaven_seed_products;
CREATE TEMPORARY TABLE tmp_northhaven_seed_products (
  shop_code VARCHAR(10) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  barcode VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  cost_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  quantity INT NOT NULL,
  low_stock_level INT NOT NULL,
  PRIMARY KEY (shop_code, barcode)
) ENGINE=MEMORY;

INSERT INTO tmp_northhaven_seed_products
  (shop_code, category_name, barcode, name, brand, cost_price, selling_price, quantity, low_stock_level)
VALUES
  ('S1', 'Kids Clothing', 'S1-DEMO-001', 'Kids Ankara Set', 'NorthHaven', 11000, 18500, 18, 5),
  ('S1', 'Kids Clothing', 'S1-DEMO-002', 'Classic Denim Jacket', 'NorthHaven', 15000, 24000, 11, 4),
  ('S1', 'Footwear', 'S1-DEMO-003', 'Canvas Sneakers', 'StepUp', 19000, 28500, 14, 4),
  ('S1', 'Accessories', 'S1-DEMO-004', 'School Backpack', 'Little Trek', 14000, 22000, 8, 3),
  ('S1', 'Accessories', 'S1-DEMO-005', 'Colourful Hair Bow Set', 'NorthHaven', 2000, 4500, 24, 6),
  ('S2', 'Handbags', 'S2-DEMO-001', 'Everyday Tote Bag', 'Urban Carry', 28000, 45000, 9, 3),
  ('S2', 'Handbags', 'S2-DEMO-002', 'Mini Crossbody Bag', 'Urban Carry', 22000, 36000, 12, 4),
  ('S2', 'Footwear', 'S2-DEMO-003', 'Ladies Comfort Sandals', 'StepUp', 16000, 27000, 15, 5),
  ('S2', 'Footwear', 'S2-DEMO-004', 'Unisex Classic Slides', 'StepUp', 9000, 15500, 3, 5),
  ('S2', 'Travel Accessories', 'S2-DEMO-005', 'Compact Travel Wallet', 'NorthHaven', 6500, 12000, 17, 5);

-- Remember which barcodes existed before this import so stock history is
-- created only for products actually added by this seed.
DROP TEMPORARY TABLE IF EXISTS tmp_northhaven_existing_products;
CREATE TEMPORARY TABLE tmp_northhaven_existing_products (
  shop_code VARCHAR(10) NOT NULL,
  barcode VARCHAR(50) NOT NULL,
  PRIMARY KEY (shop_code, barcode)
) ENGINE=MEMORY;

INSERT INTO tmp_northhaven_existing_products (shop_code, barcode)
SELECT seed.shop_code, seed.barcode
FROM tmp_northhaven_seed_products AS seed
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode;

INSERT INTO products
  (shop_id, category_id, barcode, barcode_source, name, cost_price, selling_price, quantity, low_stock_level, created_by, brand)
SELECT
  s.shop_id,
  c.category_id,
  seed.barcode,
  'manufacturer',
  seed.name,
  seed.cost_price,
  seed.selling_price,
  seed.quantity,
  seed.low_stock_level,
  @seed_owner_id,
  seed.brand
FROM tmp_northhaven_seed_products AS seed
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN categories AS c ON c.shop_id = s.shop_id AND c.name = seed.category_name
ON DUPLICATE KEY UPDATE product_id = LAST_INSERT_ID(product_id);

-- Record one initial purchase batch per matching seeded product. The
-- existence check prevents duplicate batches when this file is imported again.
INSERT INTO purchase_batches
  (shop_id, product_id, quantity, total_cost, unit_cost, recorded_by)
SELECT
  s.shop_id,
  p.product_id,
  seed.quantity,
  seed.quantity * seed.cost_price,
  seed.cost_price,
  @seed_owner_id
FROM tmp_northhaven_seed_products AS seed
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
WHERE NOT EXISTS (
  SELECT 1
  FROM tmp_northhaven_existing_products AS existing
  WHERE existing.shop_code = seed.shop_code
    AND existing.barcode = seed.barcode
)
AND NOT EXISTS (
  SELECT 1
  FROM purchase_batches AS batch
  WHERE batch.shop_id = s.shop_id
    AND batch.product_id = p.product_id
    AND batch.recorded_by = @seed_owner_id
    AND batch.quantity = seed.quantity
    AND batch.unit_cost = seed.cost_price
    AND batch.total_cost = seed.quantity * seed.cost_price
);

-- Reference-tagged stock movements are independently idempotent.
INSERT INTO stock_movements
  (shop_id, product_id, user_id, quantity, movement_type, reference)
SELECT
  s.shop_id,
  p.product_id,
  @seed_owner_id,
  seed.quantity,
  'STOCK_IN',
  'HOSTINGER-SEED'
FROM tmp_northhaven_seed_products AS seed
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
WHERE NOT EXISTS (
  SELECT 1
  FROM tmp_northhaven_existing_products AS existing
  WHERE existing.shop_code = seed.shop_code
    AND existing.barcode = seed.barcode
)
AND NOT EXISTS (
  SELECT 1
  FROM stock_movements AS movement
  WHERE movement.shop_id = s.shop_id
    AND movement.product_id = p.product_id
    AND movement.movement_type = 'STOCK_IN'
    AND movement.reference = 'HOSTINGER-SEED'
);

DROP TEMPORARY TABLE IF EXISTS tmp_northhaven_seed_sales;
CREATE TEMPORARY TABLE tmp_northhaven_seed_sales (
  seed_no INT NOT NULL PRIMARY KEY,
  shop_code VARCHAR(10) NOT NULL,
  barcode VARCHAR(50) NOT NULL,
  days_ago INT NOT NULL,
  quantity INT NOT NULL,
  payment_method ENUM('cash', 'transfer', 'card', 'other') NOT NULL
) ENGINE=MEMORY;

-- Recent sales feed daily/weekly/monthly graphs; older sales provide a
-- month-by-month history for the yearly revenue graph.
INSERT INTO tmp_northhaven_seed_sales
  (seed_no, shop_code, barcode, days_ago, quantity, payment_method)
VALUES
  (1,  'S1', 'S1-DEMO-001',   0, 1, 'cash'),
  (2,  'S2', 'S2-DEMO-001',   1, 1, 'transfer'),
  (3,  'S1', 'S1-DEMO-003',   2, 1, 'card'),
  (4,  'S2', 'S2-DEMO-004',   3, 1, 'cash'),
  (5,  'S1', 'S1-DEMO-004',   4, 1, 'other'),
  (6,  'S2', 'S2-DEMO-002',   5, 1, 'transfer'),
  (7,  'S1', 'S1-DEMO-002',   6, 1, 'cash'),
  (8,  'S2', 'S2-DEMO-003',   7, 1, 'card'),
  (9,  'S1', 'S1-DEMO-005',   8, 2, 'cash'),
  (10, 'S2', 'S2-DEMO-005',   9, 1, 'other'),
  (11, 'S1', 'S1-DEMO-001',  10, 1, 'transfer'),
  (12, 'S2', 'S2-DEMO-001',  11, 1, 'cash'),
  (13, 'S1', 'S1-DEMO-003',  12, 1, 'card'),
  (14, 'S2', 'S2-DEMO-004',  13, 1, 'cash'),
  (15, 'S1', 'S1-DEMO-002',  18, 1, 'transfer'),
  (16, 'S2', 'S2-DEMO-002',  25, 1, 'cash'),
  (17, 'S1', 'S1-DEMO-004',  35, 1, 'card'),
  (18, 'S2', 'S2-DEMO-003',  60, 1, 'cash'),
  (19, 'S1', 'S1-DEMO-001',  90, 1, 'other'),
  (20, 'S2', 'S2-DEMO-005', 120, 1, 'transfer'),
  (21, 'S1', 'S1-DEMO-003', 150, 1, 'cash'),
  (22, 'S2', 'S2-DEMO-001', 180, 1, 'card'),
  (23, 'S1', 'S1-DEMO-005', 210, 1, 'cash'),
  (24, 'S2', 'S2-DEMO-002', 240, 1, 'transfer'),
  (25, 'S1', 'S1-DEMO-002', 270, 1, 'cash');

-- Stable markers preserve each sample's original timestamp across re-imports.
INSERT INTO activity_log (user_id, action, details, created_at)
SELECT
  @seed_owner_id,
  'DEMO_SALE',
  CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0')),
  DATE_ADD(DATE_SUB(CURRENT_TIMESTAMP, INTERVAL seed.days_ago DAY), INTERVAL seed.seed_no SECOND)
FROM tmp_northhaven_seed_sales AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM activity_log AS marker
  WHERE marker.user_id = @seed_owner_id
    AND marker.action = 'DEMO_SALE'
    AND marker.details = CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0'))
);

INSERT INTO transactions (cashier_id, total_amount, created_at)
SELECT
  @seed_owner_id,
  p.selling_price * seed.quantity,
  marker.created_at
FROM tmp_northhaven_seed_sales AS seed
JOIN activity_log AS marker
  ON marker.user_id = @seed_owner_id
  AND marker.action = 'DEMO_SALE'
  AND marker.details = CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0'))
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
WHERE NOT EXISTS (
  SELECT 1
  FROM transactions AS transaction_record
  WHERE transaction_record.cashier_id = @seed_owner_id
    AND transaction_record.created_at = marker.created_at
    AND transaction_record.total_amount = p.selling_price * seed.quantity
);

INSERT INTO sales (transaction_id, shop_id, subtotal, created_at)
SELECT
  transaction_record.transaction_id,
  s.shop_id,
  p.selling_price * seed.quantity,
  marker.created_at
FROM tmp_northhaven_seed_sales AS seed
JOIN activity_log AS marker
  ON marker.user_id = @seed_owner_id
  AND marker.action = 'DEMO_SALE'
  AND marker.details = CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0'))
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
JOIN transactions AS transaction_record
  ON transaction_record.cashier_id = @seed_owner_id
  AND transaction_record.created_at = marker.created_at
  AND transaction_record.total_amount = p.selling_price * seed.quantity
WHERE NOT EXISTS (
  SELECT 1 FROM sales AS existing_sale
  WHERE existing_sale.transaction_id = transaction_record.transaction_id
);

INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale, created_at)
SELECT
  sale.sale_id,
  p.product_id,
  seed.quantity,
  p.selling_price,
  marker.created_at
FROM tmp_northhaven_seed_sales AS seed
JOIN activity_log AS marker
  ON marker.user_id = @seed_owner_id
  AND marker.action = 'DEMO_SALE'
  AND marker.details = CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0'))
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
JOIN transactions AS transaction_record
  ON transaction_record.cashier_id = @seed_owner_id
  AND transaction_record.created_at = marker.created_at
  AND transaction_record.total_amount = p.selling_price * seed.quantity
JOIN sales AS sale ON sale.transaction_id = transaction_record.transaction_id
WHERE NOT EXISTS (
  SELECT 1 FROM sale_items AS existing_item
  WHERE existing_item.sale_id = sale.sale_id
    AND existing_item.product_id = p.product_id
);

INSERT INTO payments (transaction_id, method, amount_tendered, change_given, created_at)
SELECT
  transaction_record.transaction_id,
  seed.payment_method,
  transaction_record.total_amount + IF(seed.payment_method = 'cash', 5000, 0),
  IF(seed.payment_method = 'cash', 5000, 0),
  marker.created_at
FROM tmp_northhaven_seed_sales AS seed
JOIN activity_log AS marker
  ON marker.user_id = @seed_owner_id
  AND marker.action = 'DEMO_SALE'
  AND marker.details = CONCAT('HOSTINGER-DEMO-SALE-', LPAD(seed.seed_no, 3, '0'))
JOIN shops AS s ON s.shop_code = seed.shop_code
JOIN products AS p ON p.shop_id = s.shop_id AND p.barcode = seed.barcode
JOIN transactions AS transaction_record
  ON transaction_record.cashier_id = @seed_owner_id
  AND transaction_record.created_at = marker.created_at
  AND transaction_record.total_amount = p.selling_price * seed.quantity
WHERE NOT EXISTS (
  SELECT 1 FROM payments AS existing_payment
  WHERE existing_payment.transaction_id = transaction_record.transaction_id
);

DROP TEMPORARY TABLE tmp_northhaven_seed_sales;
DROP TEMPORARY TABLE tmp_northhaven_existing_products;
DROP TEMPORARY TABLE tmp_northhaven_seed_products;
COMMIT;