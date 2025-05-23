/*
  # Authentication System Schema Update

  1. New Tables
    - `verification_codes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `code` (text)
      - `type` (text) - 'email' or 'phone'
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)
    
    - `user_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `refresh_token` (text)
      - `expires_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for secure access
*/

-- Verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  code text NOT NULL,
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own verification codes"
  ON verification_codes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read own sessions"
  ON user_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_code ON verification_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(refresh_token);