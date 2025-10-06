-- Create custom_emblems table for user-created emblems
CREATE TABLE IF NOT EXISTS public.custom_emblems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  shape text NOT NULL,
  icon text NOT NULL,
  bg_color text NOT NULL,
  icon_color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on custom_emblems
ALTER TABLE public.custom_emblems ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom emblems
CREATE POLICY "Users can view their own custom emblems"
ON public.custom_emblems
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own custom emblems
CREATE POLICY "Users can create their own custom emblems"
ON public.custom_emblems
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom emblems
CREATE POLICY "Users can update their own custom emblems"
ON public.custom_emblems
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own custom emblems
CREATE POLICY "Users can delete their own custom emblems"
ON public.custom_emblems
FOR DELETE
USING (auth.uid() = user_id);

-- Create custom_kits table for user-created kits
CREATE TABLE IF NOT EXISTS public.custom_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sport sport_type NOT NULL,
  name text NOT NULL,
  pattern text NOT NULL,
  primary_color text NOT NULL,
  secondary_color text NOT NULL,
  tertiary_color text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on custom_kits
ALTER TABLE public.custom_kits ENABLE ROW LEVEL SECURITY;

-- Users can view their own custom kits
CREATE POLICY "Users can view their own custom kits"
ON public.custom_kits
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own custom kits
CREATE POLICY "Users can create their own custom kits"
ON public.custom_kits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom kits
CREATE POLICY "Users can update their own custom kits"
ON public.custom_kits
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own custom kits
CREATE POLICY "Users can delete their own custom kits"
ON public.custom_kits
FOR DELETE
USING (auth.uid() = user_id);

-- Add custom emblem and kit references to user_teams
ALTER TABLE public.user_teams 
  ADD COLUMN IF NOT EXISTS custom_emblem_id uuid REFERENCES public.custom_emblems(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS custom_kit_id uuid REFERENCES public.custom_kits(id) ON DELETE SET NULL;