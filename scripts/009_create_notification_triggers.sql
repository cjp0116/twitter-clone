-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'retweet', 'reply', 'follow')),
  tweet_id UUID REFERENCES public.tweets(id) ON DELETE CASCADE,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
-- Users can only read their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications FOR
SELECT USING (auth.uid() = user_id);
-- Users can only update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications FOR
UPDATE USING (auth.uid() = user_id);
-- System can insert notifications for any user
CREATE POLICY "notifications_insert_all" ON public.notifications FOR
INSERT WITH CHECK (true);
-- Create indexes for performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_read_idx ON public.notifications(read);
-- Function to create notification for likes
CREATE OR REPLACE FUNCTION create_like_notification() RETURNS TRIGGER AS $$
DECLARE tweet_author_id UUID;
BEGIN -- Get the author of the tweet
SELECT author_id INTO tweet_author_id
FROM public.tweets
WHERE id = NEW.tweet_id;
-- Don't create notification if user likes their own tweet
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
-- Function to create notification for retweets
CREATE OR REPLACE FUNCTION create_retweet_notification() RETURNS TRIGGER AS $$
DECLARE original_author_id UUID;
BEGIN -- Only create notification for retweets (not original tweets)
IF NEW.retweet_of_id IS NOT NULL THEN -- Get the author of the original tweet
SELECT author_id INTO original_author_id
FROM public.tweets
WHERE id = NEW.retweet_of_id;
-- Don't create notification if user retweets their own tweet
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
-- Function to create notification for replies
CREATE OR REPLACE FUNCTION create_reply_notification() RETURNS TRIGGER AS $$
DECLARE parent_author_id UUID;
BEGIN -- Only create notification for replies (not original tweets)
IF NEW.reply_to_id IS NOT NULL THEN -- Get the author of the parent tweet
SELECT author_id INTO parent_author_id
FROM public.tweets
WHERE id = NEW.reply_to_id;
-- Don't create notification if user replies to their own tweet
IF parent_author_id != NEW.author_id THEN
INSERT INTO public.notifications (user_id, actor_id, type, tweet_id)
VALUES (parent_author_id, NEW.author_id, 'reply', NEW.id);
END IF;
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to create notification for follows
CREATE OR REPLACE FUNCTION create_follow_notification() RETURNS TRIGGER AS $$ BEGIN
INSERT INTO public.notifications (user_id, actor_id, type)
VALUES (NEW.following_id, NEW.follower_id, 'follow');
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Create triggers
DROP TRIGGER IF EXISTS like_notification_trigger ON public.likes;
CREATE TRIGGER like_notification_trigger
AFTER
INSERT ON public.likes FOR EACH ROW EXECUTE FUNCTION create_like_notification();
DROP TRIGGER IF EXISTS retweet_notification_trigger ON public.tweets;
CREATE TRIGGER retweet_notification_trigger
AFTER
INSERT ON public.tweets FOR EACH ROW EXECUTE FUNCTION create_retweet_notification();
DROP TRIGGER IF EXISTS reply_notification_trigger ON public.tweets;
CREATE TRIGGER reply_notification_trigger
AFTER
INSERT ON public.tweets FOR EACH ROW EXECUTE FUNCTION create_reply_notification();
DROP TRIGGER IF EXISTS follow_notification_trigger ON public.follows;
CREATE TRIGGER follow_notification_trigger
AFTER
INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION create_follow_notification();