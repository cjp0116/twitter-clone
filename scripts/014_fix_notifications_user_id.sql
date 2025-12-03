-- Migration script to ensure notifications table has user_id column
-- This script handles the case where the table might have been created with recipient_id
-- Check if recipient_id column exists and rename it to user_id
DO $$ BEGIN -- Check if recipient_id column exists
IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'recipient_id'
) THEN -- Rename recipient_id to user_id
ALTER TABLE public.notifications
  RENAME COLUMN recipient_id TO user_id;
RAISE NOTICE 'Renamed recipient_id to user_id in notifications table';
END IF;
-- Ensure user_id column exists (create if it doesn't exist)
IF NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'user_id'
) THEN -- Add user_id column if it doesn't exist
ALTER TABLE public.notifications
ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
-- If recipient_id existed, we already renamed it above, so this won't run
-- But if neither existed, we need to populate it
-- For now, we'll just add the column and let existing triggers handle new notifications
RAISE NOTICE 'Added user_id column to notifications table';
END IF;
END $$;
-- Update RLS policies to use user_id
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications FOR
SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
CREATE POLICY "notifications_update_own" ON public.notifications FOR
UPDATE USING (auth.uid() = user_id);
-- Ensure index exists on user_id
DROP INDEX IF EXISTS public.notifications_user_id_idx;
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);