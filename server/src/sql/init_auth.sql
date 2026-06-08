CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'staff')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
