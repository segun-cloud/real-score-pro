-- Add onboarding and preferences columns to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS favourite_sports text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS favourite_teams jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS favourite_players jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;