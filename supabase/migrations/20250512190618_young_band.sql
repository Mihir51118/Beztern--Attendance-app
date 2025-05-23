/*
  # Add Google Authentication Support

  1. Changes
    - Add `google_id` column to users table
    - Add `role` column to users table for admin access
    - Add `csv_files` table for storing generated reports

  2. Security
    - Enable RLS on csv_files table
    - Add policies for admin access
*/

-- Add Google ID column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS google_id text UNIQUE,
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- Create CSV files table
CREATE TABLE IF NOT EXISTS csv_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  file_url text NOT NULL,
  created_at timestamptz DEFAULT now(),
  file_type text NOT NULL CHECK (file_type IN ('attendance', 'shop_visit', 'combined')),
  date_range jsonb
);

-- Enable RLS
ALTER TABLE csv_files ENABLE ROW LEVEL SECURITY;

-- Policies for csv_files
CREATE POLICY "Admins can read all CSV files"
  ON csv_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can read own CSV files"
  ON csv_files
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_csv_files_user ON csv_files(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_files_type ON csv_files(file_type);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_google ON users(google_id);