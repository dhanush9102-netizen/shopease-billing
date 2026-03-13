-- ============================================================
--  Retail Shop Billing System — Database Setup Script
--  Compatible with: MySQL 5.7+ / MySQL 8.0
--
--  ⚠️  CLEVER CLOUD USERS:
--      Do NOT run CREATE DATABASE — Clever Cloud creates the DB for you.
--      Just paste everything BELOW the "USE" line into the
--      Clever Cloud MySQL console (PhpMyAdmin or CLI).
--
--  LOCAL USERS:
--      Run the full file in MySQL Workbench.
-- ============================================================

-- LOCAL ONLY: uncomment these 2 lines if running on local MySQL
-- CREATE DATABASE IF NOT EXISTS billing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE billing_system;

-- ============================================================
--  TABLE: products
--  Stores all items available for sale in the shop
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  product_id   INT           NOT NULL AUTO_INCREMENT,
  product_name VARCHAR(150)  NOT NULL,
  price        DECIMAL(10,2) NOT NULL,
  stock        INT           NOT NULL DEFAULT 0,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  TABLE: bills
--  Each row represents one customer invoice
-- ============================================================
CREATE TABLE IF NOT EXISTS bills (
  bill_id       INT           NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(150)  NOT NULL,
  total_amount  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  bill_date     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (bill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  TABLE: bill_items
--  Line items (products) belonging to each bill
-- ============================================================
CREATE TABLE IF NOT EXISTS bill_items (
  id         INT           NOT NULL AUTO_INCREMENT,
  bill_id    INT           NOT NULL,
  product_id INT           NOT NULL,
  quantity   INT           NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_bill    FOREIGN KEY (bill_id)    REFERENCES bills(bill_id)    ON DELETE CASCADE,
  CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
--  SAMPLE DATA: products
-- ============================================================
INSERT INTO products (product_name, price, stock) VALUES
  ('Basmati Rice (1 kg)',    65.00,  200),
  ('Sunflower Oil (1 L)',   125.00,  150),
  ('Whole Wheat Flour (1 kg)', 42.00, 300),
  ('Tata Salt (1 kg)',        20.00,  400),
  ('Sugar (1 kg)',            45.00,  250),
  ('Toor Dal (1 kg)',        110.00,  180),
  ('Turmeric Powder (100g)', 28.00,  350),
  ('Red Chilli Powder (100g)',32.00, 320),
  ('Biscuits (Parle-G)',      10.00,  500),
  ('Amul Butter (100g)',      55.00,  120),
  ('Milk (500 ml)',           28.00,  200),
  ('Colgate Toothpaste',      75.00,  100),
  ('Soap (Lux)',              35.00,  180),
  ('Shampoo Sachet',           5.00,  600),
  ('Bottled Water (1 L)',     20.00,  300);

-- ============================================================
--  SAMPLE DATA: bills & bill_items
-- ============================================================

-- Bill 1
INSERT INTO bills (customer_name, total_amount, bill_date) VALUES
  ('Ravi Kumar', 268.00, '2025-03-01 10:15:00');
INSERT INTO bill_items (bill_id, product_id, quantity, price) VALUES
  (1, 1, 2, 65.00),   -- 2 × Basmati Rice
  (1, 4, 1, 20.00),   -- 1 × Salt
  (1, 5, 1, 45.00),   -- 1 × Sugar
  (1, 9, 3, 10.00),   -- 3 × Biscuits
  (1, 11,2, 28.00);   -- 2 × Milk

-- Bill 2
INSERT INTO bills (customer_name, total_amount, bill_date) VALUES
  ('Priya Sharma', 435.00, '2025-03-02 14:30:00');
INSERT INTO bill_items (bill_id, product_id, quantity, price) VALUES
  (2, 2, 2, 125.00),  -- 2 × Sunflower Oil
  (2, 6, 1, 110.00),  -- 1 × Toor Dal
  (2, 7, 1,  28.00),  -- 1 × Turmeric
  (2, 12,1,  75.00);  -- 1 × Toothpaste

-- Bill 3
INSERT INTO bills (customer_name, total_amount, bill_date) VALUES
  ('Suresh Mehta', 185.00, '2025-03-03 09:45:00');
INSERT INTO bill_items (bill_id, product_id, quantity, price) VALUES
  (3, 3, 2,  42.00),  -- 2 × Wheat Flour
  (3, 8, 1,  32.00),  -- 1 × Chilli Powder
  (3, 10,1,  55.00),  -- 1 × Butter
  (3, 13,1,  35.00);  -- 1 × Soap

-- ============================================================
--  Verify setup
-- ============================================================
SELECT 'Database setup complete!' AS status;
SELECT COUNT(*) AS total_products FROM products;
SELECT COUNT(*) AS total_bills    FROM bills;
