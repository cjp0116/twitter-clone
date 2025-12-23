-- Create hashtags table
CREATE TABLE IF NOT EXISTS public.hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL UNIQUE,
  tweet_count INTEGER DEFAULT 0 CHECK (tweet_count >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Create tweet_hashtags junction table
CREATE TABLE IF NOT EXISTS public.tweet_hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_tweet_hashtag UNIQUE (tweet_id, hashtag_id)
);
-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON public.hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_hashtags_tweet_count ON public.hashtags(tweet_count DESC);
CREATE INDEX IF NOT EXISTS idx_hashtags_updated_at ON public.hashtags(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tweet_hashtags_tweet_id ON public.tweet_hashtags(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_hashtags_hashtag_id ON public.tweet_hashtags(hashtag_id);
-- Enable RLS
ALTER TABLE public.hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tweet_hashtags ENABLE ROW LEVEL SECURITY;
-- RLS Policies for hashtags
CREATE POLICY "Anyone can view hashtags" ON public.hashtags FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert hashtags" ON public.hashtags FOR
INSERT TO authenticated WITH CHECK (true);
-- NOTE: No UPDATE policy for hashtags - tweet_count is managed exclusively
-- by SECURITY DEFINER trigger functions (increment/decrement_hashtag_count)
-- RLS Policies for tweet_hashtags
CREATE POLICY "Anyone can view tweet_hashtags" ON public.tweet_hashtags FOR
SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert tweet_hashtags for their tweets" ON public.tweet_hashtags FOR
INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tweets
      WHERE id = tweet_id
        AND author_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete tweet_hashtags for their tweets" ON public.tweet_hashtags FOR DELETE TO authenticated USING (
  EXISTS (
    SELECT 1
    FROM public.tweets
    WHERE id = tweet_id
      AND author_id = auth.uid()
  )
);
-- Function to increment hashtag tweet count
CREATE OR REPLACE FUNCTION increment_hashtag_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $ BEGIN
UPDATE public.hashtags
SET tweet_count = tweet_count + 1,
  updated_at = NOW()
WHERE id = NEW.hashtag_id;
RETURN NEW;
END;
$;
-- Function to decrement hashtag tweet count
CREATE OR REPLACE FUNCTION decrement_hashtag_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $ BEGIN
UPDATE public.hashtags
SET tweet_count = GREATEST(0, tweet_count - 1),
  updated_at = NOW()
WHERE id = OLD.hashtag_id;
RETURN OLD;
END;
$;
-- Triggers for auto-updating tweet counts
DROP TRIGGER IF EXISTS trigger_increment_hashtag_count ON public.tweet_hashtags;
CREATE TRIGGER trigger_increment_hashtag_count
AFTER
INSERT ON public.tweet_hashtags FOR EACH ROW EXECUTE FUNCTION increment_hashtag_count();
DROP TRIGGER IF EXISTS trigger_decrement_hashtag_count ON public.tweet_hashtags;
CREATE TRIGGER trigger_decrement_hashtag_count
AFTER DELETE ON public.tweet_hashtags FOR EACH ROW EXECUTE FUNCTION decrement_hashtag_count();
-- Grant permissions
GRANT SELECT,
  INSERT ON public.hashtags TO authenticated;
GRANT SELECT,
  INSERT,
  DELETE ON public.tweet_hashtags TO authenticated;