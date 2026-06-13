CREATE DATABASE Lucky_Shrub;
USE Lucky_Shrub; 
--  table orders;
-- drop table orders;
CREATE TABLE Orders (OrderID INT NOT NULL PRIMARY KEY, ClientID VARCHAR(10), ProductID VARCHAR(10), Quantity INT, Cost DECIMAL(6, 2));
INSERT INTO Orders (OrderID, ClientID, ProductID, Quantity, Cost)
VALUES (1, "Cl1", "P1", 10, 500), (2, "Cl2", "P2", 5, 100),
(3, "Cl3", "P3", 20, 800), (4, "Cl4", "P4", 15, 150),
 (5, "Cl3", "P3", 10, 450), (6, "Cl2", "P2", 5, 800), 
 (7, "Cl1", "P4", 22, 1200), (8, "Cl1", "P1", 15, 150);

-- Task 1: Write a SQL statement to create the OrdersView Virtual table based on the
-- Orders table. The table must include the following columns: Order ID, Quantity and
-- Cost. Once you have executed the query, select all data from the OrdersView table. The
-- expected output result should be the same as the following screenshot (assuming that
-- you have created and populated the table correctly).
CREATE VIEW OrdersView AS
SELECT OrderID, Quantity, Cost
FROM Orders;

SELECT * FROM OrdersView;

-- Task 2: Write a SQL statement that utilizes the ‘OrdersView’ virtual table to Update the
-- base Orders table. In the UPDATE TABLE statement, change the cost to 200 where the
-- order id equals 2. Once you have executed the query, select all data from the
-- OrdersView table. The expected output result should be the same as the following
-- screenshot (assuming that you have created and populated the table correctly).
UPDATE OrdersView
SET Cost = 200
WHERE OrderID = 2;

SELECT * FROM OrdersView;

-- Task 3: Write a SQL statement that changes the name of the ‘OrdersView’ virtual table
-- to ClientsOrdersView.
RENAME TABLE OrdersView TO ClientsOrdersView;

SELECT * FROM ClientsOrdersView;

-- Task 4: Write a SQL statement to delete the Orders virtual table.
DROP VIEW ClientsOrdersView;