-- =============================================================================
-- OPTIONAL — only needed if staff account does NOT already exist in app_user
-- =============================================================================
-- "Seed" = insert starter/demo data into the database (like planting a seed).
--
-- This file pre-creates ONE staff login so evaluators can test the Staff portal
-- without signing up manually.
--
-- YOU DO NOT NEED THIS if vs@gmail.com is already in your database (your case).
-- Evaluators cloning a fresh repo CAN run: psql -d awo_db -f server/src/sql/seed_staff.sql
--
-- Demo staff: vs@gmail.com / abc
-- =============================================================================

INSERT INTO app_user (name, email, password_hash, role)
VALUES (
  'Staff User',
  'vs@gmail.com',
  '$2b$10$.zdBbX0.PNGL8VhN0KL92OgZEtiCI11XOccdrqs3MUTV5uB0mX5hG',
  'staff'
)
ON CONFLICT (email) DO UPDATE SET role = 'staff', password_hash = EXCLUDED.password_hash;
