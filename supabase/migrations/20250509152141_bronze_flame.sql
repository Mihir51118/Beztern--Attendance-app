/*
  # Authentication System Schema

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `phone` (text, unique)
      - `full_name` (text)
      - `password_hash` (text)
      - `email_verified` (boolean)
      - `phone_verified` (boolean)
      - `failed_attempts` (integer)
      - `locked_until` (timestamptz)
      - `last_login` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `verification_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `token` (text)
      - `type` (text) - 'email' or 'phone'
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `password_reset_tokens`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `token` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
    - Hash and salt all passwords
    - Rate limiting through application logic
*/

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text UNIQUE,
  full_name text NOT NULL,
  password_hash text NOT NULL,
  email_verified boolean DEFAULT false,
  phone_verified boolean DEFAULT false,
  failed_attempts integer DEFAULT 0,
  locked_until timestamptz,
  last_login timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Verification tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can read own verification tokens"
  ON verification_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own password reset tokens"
  ON password_reset_tokens
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_token ON verification_tokens(user_id, token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_token ON password_reset_tokens(user_id, token);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();