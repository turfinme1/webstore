-- Migration: AddStockPriceColumnInProducts
-- Created at: 2025-01-21T10:24:00.047Z

ALTER TABLE products
ADD COLUMN stock_price DECIMAL(10, 2) NULL DEFAULT 0;

UPDATE products
SET stock_price = price * 0.5;

ALTER TABLE orders
ADD COLUMN total_stock_price DECIMAL(10, 2) NULL DEFAULT 0;

UPDATE orders
SET total_stock_price = total_price * 0.5;