-- Fix api_request_log table - disable RLS since it's a log table that doesn't need row-level access control
ALTER TABLE public.api_request_log DISABLE ROW LEVEL SECURITY;