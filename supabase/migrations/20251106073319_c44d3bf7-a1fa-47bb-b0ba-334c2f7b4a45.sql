-- Fix security issues: Restrict api_request_log and api_match_cache access

-- 1. Restrict api_request_log to admin-only access
DROP POLICY IF EXISTS "Service role can select logs" ON public.api_request_log;
DROP POLICY IF EXISTS "Service role can insert logs" ON public.api_request_log;

CREATE POLICY "Admins can view API logs"
  ON public.api_request_log
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert logs"
  ON public.api_request_log
  FOR INSERT
  WITH CHECK (true);

-- 2. Restrict api_match_cache to authenticated users only
DROP POLICY IF EXISTS "Authenticated users can view cached matches" ON public.api_match_cache;

CREATE POLICY "Authenticated users can view cached matches"
  ON public.api_match_cache
  FOR SELECT
  USING (auth.uid() IS NOT NULL);