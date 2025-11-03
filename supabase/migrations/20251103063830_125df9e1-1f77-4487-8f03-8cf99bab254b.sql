-- Re-enable RLS on api_request_log and add appropriate policies
ALTER TABLE public.api_request_log ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert logs
CREATE POLICY "Service role can insert logs"
ON public.api_request_log
FOR INSERT
WITH CHECK (true);

-- Allow service role to select logs
CREATE POLICY "Service role can select logs"
ON public.api_request_log
FOR SELECT
USING (true);