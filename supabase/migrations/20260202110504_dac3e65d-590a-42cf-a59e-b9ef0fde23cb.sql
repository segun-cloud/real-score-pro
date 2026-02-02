-- Add INSERT policy for user_notifications table
-- This allows service role (edge functions) to create notifications for users
CREATE POLICY "Service role can insert notifications" 
ON public.user_notifications 
FOR INSERT 
WITH CHECK (true);