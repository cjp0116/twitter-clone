-- ========================================
-- COMPLETE FIX: Drop all old functions and recreate with user_id
-- ========================================
-- 1. Drop all existing notification functions (removes any old cached versions)
DROP FUNCTION IF EXISTS create_like_notification() CASCADE;
DROP FUNCTION IF EXISTS create_retweet_notification() CASCADE;
DROP FUNCTION IF EXISTS create_reply_notification() CASCADE;
DROP FUNCTION IF EXISTS create_follow_notification() CASCADE;
-- 2. Ensure notifications table has correct column
DO $$ BEGIN IF EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'notifications'
    AND column_name = 'recipient_id'
) THEN
ALTER TABLE public.notifications
  RENAME COLUMN recipient_id TO user_id;
END IF;
END $$;
-- 3. Recreate all notification functions with correct column name
-- Like notification function
CREATE OR REPLACE FUNCTION create_like_notification() RETURNS TRIGGER AS $$
DECLARE tweet_author_id UUID;
BEGIN
SELECT author_id INTO tweet_author_id
FROM public.tweets
WHERE id = NEW.tweet_id;
IF tweet_author_id != NEW.user_id THEN
INSERT INTO public.notifications (user_id, actor_id, type, tweet_id)
VALUES (
    tweet_author_id,
    NEW.user_id,
    'like',
    NEW.tweet_id
  );
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Retweet notification function (this is where the error occurs)
CREATE OR REPLACE FUNCTION create_retweet_notification() RETURNS TRIGGER AS $$
DECLARE original_author_id UUID;
BEGIN IF NEW.retweet_of_id IS NOT NULL THEN
SELECT author_id INTO original_author_id
FROM public.tweets
WHERE id = NEW.retweet_of_id;
IF original_author_id != NEW.author_id THEN
INSERT INTO public.notifications (user_id, actor_id, type, tweet_id)
VALUES (
    original_author_id,
    NEW.author_id,
    'retweet',
    NEW.id
  );
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Reply notification function
CREATE OR REPLACE FUNCTION create_reply_notification() RETURNS TRIGGER AS $$
DECLARE parent_author_id UUID;
BEGIN IF NEW.reply_to_id IS NOT NULL THEN
SELECT author_id INTO parent_author_id
FROM public.tweets
WHERE id = NEW.reply_to_id;
IF parent_author_id != NEW.author_id THEN
INSERT INTO public.notifications (user_id, actor_id, type, tweet_id)
VALUES (parent_author_id, NEW.author_id, 'reply', NEW.id);
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Follow notification function
CREATE OR REPLACE FUNCTION create_follow_notification() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.notifications (user_id, actor_id, type)
VALUES (NEW.following_id, NEW.follower_id, 'follow');
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 4. Drop and recreate all triggers
DROP TRIGGER IF EXISTS like_notification_trigger ON public.likes;
DROP TRIGGER IF EXISTS retweet_notification_trigger ON public.tweets;
DROP TRIGGER IF EXISTS reply_notification_trigger ON public.tweets;
DROP TRIGGER IF EXISTS follow_notification_trigger ON public.follows;
CREATE TRIGGER like_notification_trigger
AFTER
INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION create_like_notification();
CREATE TRIGGER retweet_notification_trigger
AFTER
INSERT ON public.tweets FOR EACH ROW EXECUTE FUNCTION create_retweet_notification();
CREATE TRIGGER reply_notification_trigger
AFTER
INSERT ON public.tweets FOR EACH ROW EXECUTE FUNCTION create_reply_notification();
CREATE TRIGGER follow_notification_trigger
AFTER
INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION create_follow_notification();
-- 5. Verify everything is correct
SELECT 'Notifications table structure:' as info,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;