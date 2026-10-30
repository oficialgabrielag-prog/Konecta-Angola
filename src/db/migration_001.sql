-- Migration 001: Add missing core tables and columns for KONECTA Auth
-- Account: 08421a35d6856d59ffd7a3a13041e637
-- Database: konectaangola (9735a337-c6c3-416e-ab8a-c51ca4038b2e)

-- 1. Create users table (Auth)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Create idea_votes table (was missing)
CREATE TABLE IF NOT EXISTS idea_votes (
  id TEXT PRIMARY KEY,
  idea_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(idea_id, user_id),
  FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- 4. Add role column to profiles if it doesn't exist
-- SQLite doesn't have "ADD COLUMN IF NOT EXISTS", so we check first or use a script.
-- In D1 execute, we can just try it; if it fails, it's usually because it already exists.
-- However, we can use a more surgical approach.
ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'member';

-- Indices
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
