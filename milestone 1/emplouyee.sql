CREATE DATABASE subquery_lab;
USE subquery_lab;

CREATE TABLE departments (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(50),
    location_id INT
);

INSERT INTO departments VALUES
(10, 'HR', 100),
(20, 'Finance', 200),
(30, 'IT', 100),
(40, 'Sales', 300);

CREATE TABLE employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    salary INT,
    department_id INT,
    job_id VARCHAR(20),
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

INSERT INTO employees VALUES
(101, 'Ali', 'Khan', 3000, 10, 'HR_REP'),
(102, 'Sara', 'Ahmed', 7000, 20, 'FI_MGR'),
(103, 'Usman', 'Ali', 5000, 30, 'IT_PROG'),
(104, 'Hina', 'Sheikh', 4500, 30, 'IT_PROG'),
(105, 'Bilal', 'Raza', 3500, 40, 'PU_CLERK'),
(106, 'Ayesha', 'Malik', 2500, 40, 'PU_CLERK'),
(107, 'Zain', 'Iqbal', 6000, 20, 'FI_MGR'),
(108, 'Maham', 'Ali', 2000, 10, 'HR_REP');

SELECT first_name, salary FROM employees WHERE salary = (SELECT MIN(salary) FROM employees);

SELECT first_name, salary FROM employees WHERE salary < (SELECT AVG(salary) FROM employees);

-- SELECT first_name FROM employees WHERE department_id IN (SELECT department_id FROM departments WHERE location_id=100);

SELECT first_name FROM employees WHERE department_id = (SELECT department_id FROM employees WHERE employee_id=101);

-- SELECT first_name FROM employees WHERE salary < ANY (SELECT salary FROM employees WHERE job_id='PU_CLERK');

SELECT first_name, salary FROM employees WHERE salary > ANY (SELECT salary FROM employees WHERE department_id=40);

SELECT first_name, salary FROM employees WHERE salary > ALL (SELECT salary FROM employees WHERE department_id=40);
