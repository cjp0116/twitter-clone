-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Notification type preferences
  likes_enabled BOOLEAN DEFAULT true,
  retweets_enabled BOOLEAN DEFAULT true,
  replies_enabled BOOLEAN DEFAULT true,
  follows_enabled BOOLEAN DEFAULT true,
  mentions_enabled BOOLEAN DEFAULT true,
  quote_tweets_enabled BOOLEAN DEFAULT true,

  -- Advanced preferences
  email_notifications BOOLEAN DEFAULT false,
  push_notifications BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_preferences_per_user UNIQUE (user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id
  ON public.notification_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON public.notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Function to create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create preferences when a new profile is created
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON public.profiles;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Helper function to check if notification type is enabled for user
CREATE OR REPLACE FUNCTION is_notification_enabled(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  CASE p_notification_type
    WHEN 'like' THEN
      SELECT likes_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    WHEN 'retweet' THEN
      SELECT retweets_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    WHEN 'reply' THEN
      SELECT replies_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    WHEN 'follow' THEN
      SELECT follows_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    WHEN 'mention' THEN
      SELECT mentions_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    WHEN 'quote' THEN
      SELECT quote_tweets_enabled INTO v_enabled
      FROM public.notification_preferences
      WHERE user_id = p_user_id;
    ELSE
      v_enabled := true; -- Default to enabled for unknown types
  END CASE;

  -- If no preferences found, default to true
  RETURN COALESCE(v_enabled, true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update existing notification triggers to check preferences
-- This is a modified version of the notification functions that checks preferences

-- Note: You'll need to update your existing notification trigger functions
-- to call is_notification_enabled() before creating notifications.
-- Example:
-- IF is_notification_enabled(tweet_author_id, 'like') THEN
--   INSERT INTO notifications ...
-- END IF;
