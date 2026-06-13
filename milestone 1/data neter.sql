

-- Create Products Table for Comparison Practice
CREATE TABLE Products (
    product_id INT PRIMARY KEY,           -- Unique identifier
    product_name VARCHAR(100),            -- Name for text matching (LIKE)
    category VARCHAR(50),                 -- Grouping for list comparisons (IN)
    price DECIMAL(10, 2),                 -- Cost for greater/less than (>, <)
    stock_quantity INT,                   -- Amount for greater/equal (>=, <=)
    restock_date DATE,                    -- Date for range comparisons (BETWEEN)
    supplier_code VARCHAR(10)             -- Nullable column for missing data checks (IS NULL)
);

-- Insert Practice Data
INSERT INTO Products (product_id, product_name, category, price, stock_quantity, restock_date, supplier_code) VALUES
(1, 'Wireless Mouse', 'Electronics', 25.99, 150, '2026-04-10', 'SUP-A'),
(2, 'Mechanical Keyboard', 'Electronics', 89.50, 45, '2026-03-15', 'SUP-A'),
(3, 'Coffee Mug', 'Kitchen', 12.00, 300, '2026-01-20', NULL),
(4, 'Desk Lamp', 'Office', 35.00, 20, '2026-04-28', 'SUP-B'),
(5, 'Ergonomic Chair', 'Office', 199.99, 5, '2025-11-05', 'SUP-C'),
(6, 'Bluetooth Speaker', 'Electronics', 45.00, 0, '2026-02-10', 'SUP-A'),
(7, 'Water Bottle', 'Kitchen', 15.50, 80, '2026-04-01', NULL);