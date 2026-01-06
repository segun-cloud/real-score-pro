-- Add new columns to competitions table for enhanced competition management
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS min_participants INTEGER DEFAULT 4;
ALTER TABLE competitions ADD COLUMN IF NOT EXISTS format TEXT DEFAULT 'single_round_robin';

-- Update existing competitions to have registration_deadline set to 2 days before start_date
UPDATE competitions 
SET registration_deadline = start_date - INTERVAL '2 days'
WHERE registration_deadline IS NULL;

-- Add a constraint for valid format values
ALTER TABLE competitions ADD CONSTRAINT valid_format CHECK (format IN ('single_round_robin', 'double_round_robin'));