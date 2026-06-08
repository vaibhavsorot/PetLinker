-- Full database schema for PetLinker
-- Run from repo root: psql -d awo_db -f server/src/sql/schema.sql

CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'staff')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shelter (
    shelterid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    capacity INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS animal (
    animalid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    species VARCHAR(50),
    status VARCHAR(30) DEFAULT 'Available',
    shelterid INT REFERENCES shelter(shelterid)
);

CREATE TABLE IF NOT EXISTS adopter (
    adopterid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    homeenvironment TEXT,
    financialstatus TEXT
);

CREATE TABLE IF NOT EXISTS adoption (
    adoptionid SERIAL PRIMARY KEY,
    animalid INT REFERENCES animal(animalid),
    adopterid INT REFERENCES adopter(adopterid),
    adoptiondate DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected'))
);

CREATE TABLE IF NOT EXISTS rescuereport (
    reportid SERIAL PRIMARY KEY,
    reportername VARCHAR(100) NOT NULL,
    location VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    urgency VARCHAR(10) NOT NULL CHECK (urgency IN ('Low', 'Medium', 'High')),
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ongoing', 'Resolved'))
);

CREATE TABLE IF NOT EXISTS donation (
    donationid SERIAL PRIMARY KEY,
    donorname VARCHAR(100) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    shelterid INT REFERENCES shelter(shelterid)
);

CREATE TABLE IF NOT EXISTS veterinarian (
    vetid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS medicalrecord (
    recordid SERIAL PRIMARY KEY,
    animalid INT REFERENCES animal(animalid),
    treatment VARCHAR(200),
    vaccinationdate DATE,
    nextcheckupdate DATE,
    vetid INT REFERENCES veterinarian(vetid)
);

CREATE TABLE IF NOT EXISTS license (
    licenseid SERIAL PRIMARY KEY,
    ownername VARCHAR(100) NOT NULL,
    animalid INT REFERENCES animal(animalid),
    issuedate DATE,
    expirydate DATE,
    status VARCHAR(20) DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS staffmember (
    staffid SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    contactinfo VARCHAR(100),
    assignedshelterid INT REFERENCES shelter(shelterid)
);
