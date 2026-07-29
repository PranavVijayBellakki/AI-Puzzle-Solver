-- Supabase PostgreSQL Relational Database Schema Setup
-- Database: Supabase PostgreSQL / Local Postgres 15+

-- Enable standard UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean previous instances (if running in re-migration setup)
DROP TABLE IF EXISTS saved_puzzles CASCADE;
DROP TABLE IF EXISTS game_history CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'local', -- 'local' or 'google'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Optimization Index for authorization email lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- 2. Game History Table
CREATE TABLE game_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL, -- 'SUDOKU', 'KAKURO', 'CHECKERS', 'NQUEENS'
    result VARCHAR(50) NOT NULL,    -- 'SOLVED', 'FAILED', 'DRAW', 'WIN', 'LOSS'
    moves JSONB NOT NULL,           -- Stores full historical state traces for search replays
    time_taken_ms BIGINT NOT NULL,
    nodes_explored BIGINT NOT NULL,
    backtracks BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for retrieving history filtered by user
CREATE INDEX idx_game_history_user_id ON game_history(user_id);
-- Compound index for optimal leaderboard query execution
CREATE INDEX idx_leaderboards ON game_history(game_type, time_taken_ms ASC) WHERE result = 'SOLVED';

-- 3. Saved Puzzles Table
CREATE TABLE saved_puzzles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    state JSONB NOT NULL,           -- Houses puzzle layouts (initialGrid, currentGrid, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for retrieving user saved configurations
CREATE INDEX idx_saved_puzzles_user_id ON saved_puzzles(user_id);

-- =========================================================================
-- SEED DATA CONFIGURATION
-- Pre-seeding default demo researcher credentials
-- Username: Raj
-- Email: raj@123
-- Password: raj@123
-- BCrypt password hash generation cost factor 10:
-- =========================================================================
INSERT INTO users (id, email, username, password_hash, provider)
VALUES (
    '8c5b8b98-dfd4-4a49-92bb-d92ea407c082',
    'raj@123',
    'Raj',
    '$2a$10$7Z2v1iM.N1U8pWJqKuxRWeTymg4hQhZJmYgK79vM683b5uV1bXf0W',
    'local'
);
