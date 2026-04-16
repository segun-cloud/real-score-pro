-- Atomic coin deduction. Returns the NEW coin balance, or raises if insufficient.
CREATE OR REPLACE FUNCTION public.deduct_coins(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance integer;
BEGIN
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  UPDATE public.user_profiles
  SET coins = coins - _amount,
      updated_at = now()
  WHERE id = _user_id
    AND coins >= _amount
  RETURNING coins INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  RETURN new_balance;
END;
$$;

-- Index on user_favourites for faster lookups by user + type
CREATE INDEX IF NOT EXISTS idx_user_favourites_user_type
  ON public.user_favourites (user_id, entity_type);