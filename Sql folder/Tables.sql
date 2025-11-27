USE patient_system;
GO
USE patient_system;
GO

-- Users table
CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50),
    fullname VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(20)
);

-- Patients table
CREATE TABLE patients (
    id INT IDENTITY(1,1) PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(150),
    medical_history TEXT
);

-- Appointments table
CREATE TABLE appointments (
    id INT IDENTITY(1,1) PRIMARY KEY,
    patient_id INT,
    appointment_date DATETIME,
    doctor_name VARCHAR(150),
    status VARCHAR(50) DEFAULT 'scheduled',
    FOREIGN KEY (patient_id) REFERENCES patients(id)
);
