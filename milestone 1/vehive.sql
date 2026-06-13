CREATE DATABASE Auto_DB;
USE Auto_DB;
drop database auto_db;

CREATE TABLE Owner (
    OwnerID VARCHAR(10) PRIMARY KEY,
    OwnerName VARCHAR(50) NOT NULL,
    OwnerAddress VARCHAR(255)
);
select * from Owner;
CREATE TABLE Vehicle (
    VehicleID VARCHAR(10) PRIMARY KEY,
    OwnerID VARCHAR(10),
    PlateNumber VARCHAR(10) NOT NULL UNIQUE,
    PhoneNumber VARCHAR(15) NOT NULL UNIQUE
);
select * from vehicle;
ALTER TABLE Vehicle
ADD CONSTRAINT fk_owner
FOREIGN KEY (OwnerID) REFERENCES Owner(OwnerID);
describe vehicle;
CREATE TABLE Registration (
    VehicleID VARCHAR(10),
    RegistrationNumber VARCHAR(15),
    RegistrationDate DATE,
    PRIMARY KEY (VehicleID, RegistrationNumber)
);

DESCRIBE Owner;
DESCRIBE Vehicle;
DESCRIBE Registration;