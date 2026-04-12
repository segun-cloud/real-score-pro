
-- 1. Fix reminder_sent_cache SELECT: scope to owner
DROP POLICY IF EXISTS "Anyone can read reminders" ON public.reminder_sent_cache;
CREATE POLICY "Users can read their own reminders"
  ON public.reminder_sent_cache
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Fix reminder_sent_cache INSERT: remove public true, keep service-role only
DROP POLICY IF EXISTS "Service can insert reminders" ON public.reminder_sent_cache;
-- Service role bypasses RLS, so no public INSERT policy needed

-- 3. Fix user_notifications INSERT: remove public true policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.user_notifications;
-- Service role bypasses RLS, so no public INSERT policy needed

-- 4. Fix api_request_log INSERT: remove public true policy  
DROP POLICY IF EXISTS "Service role can insert logs" ON public.api_request_log;
-- Service role bypasses RLS, so no public INSERT policy needed
