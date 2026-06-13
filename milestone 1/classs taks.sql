CREATE DATABASE imsciences;
 
USE imsciences;
 
-- Create Departments Table
CREATE TABLE Departments (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(50)
);

-- Create Employees Table
CREATE TABLE Employees (
    emp_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10, 2),
    performance_score DECIMAL(3, 1),
    dept_id INT,
    FOREIGN KEY (dept_id) REFERENCES Departments(dept_id)
);

-- Insert Practice Data
INSERT INTO Departments (dept_id, dept_name) VALUES 
(1, 'Software Engineering'),
(2, 'Data Science'),
(3, 'Computer science');

INSERT INTO Employees (emp_id, first_name, last_name, email, hire_date, salary, performance_score, dept_id) VALUES
(101, 'Omar', 'bin samin', 'omar.f@company.com', '2022-03-15', 75000.50, 4.2, 1),
(102, 'Ayesha', 'Khan', 'ayesha.k@company.com', '2023-06-01', 82000.75, 4.8, 2),
(103, 'saher', 'Ali', 'ahmad.a@company.com', '2021-11-20', 64000.00, 3.5, 1),
(104, 'Maimoona', 'Tariq', 'maimoona.t@company.com', '2019-01-10', 95000.25, 4.9, 3),
(105, 'Hammad', 'Shakeel', 'hammad.s@company.com', '2024-02-15', 71000.00, 4.0, 2);



-- --------------------------------------------------
-- --------------------------------------------------

select * from Departments;
select * from Employees;

update Employees
set salary = 400000
where emp_id = 105;

update Employees
set performance_score = 5.7
where emp_id = 105;

update Employees
set dept_id = 3
where emp_id = 105;

insert into Employees values (105, 'Hammad', 'Shakeel', 'hammad.s@company.com', '2024-02-15', 71000.00, 4.0, 2);

-- ----------------------------------------
select * from Departments;
select * from Employees;

-- Departments (dept_id, dept_name)
-- Employees (emp_id, first_name, last_name, email, hire_date, salary, performance_score, dept_id)

-- numeric functions
select round(performance_score,1) from Employees;

select mod(performance_score, 3) from Employees;

select round(mod(sqrt(salary),10),2) from Employees;

-- string functions
select concat(first_name, ' ', last_name) as full_name, substring(hire_date, 6, 5) as date from Employees;

select upper(dept_name) as name from Departments;

select lower(dept_name) as name from Departments;

-- Comparison Fucntion
-- greatest -- least -- isnull --



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

-- Products (product_id, product_name, category, price, stock_quantity, restock_date, supplier_code)

select greatest(price,stock_quantity) from Products;
select * from Products where supplier_code is null ;
select least(price,stock_quantity) from Products;


-- DATE FUNCTI0NS 
select date_format(hire_date, '%Y,%M,%D') from Employees;



















