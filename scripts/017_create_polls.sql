-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id UUID NOT NULL REFERENCES public.tweets(id) ON DELETE CASCADE,
  duration_hours INTEGER NOT NULL CHECK (duration_hours IN (1, 24, 72, 168)),
  -- 1h, 1d, 3d, 7d
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_poll_per_tweet UNIQUE (tweet_id)
);
-- Create poll_options table
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (char_length(option_text) <= 25),
  vote_count INTEGER DEFAULT 0 CHECK (vote_count >= 0),
  position INTEGER NOT NULL CHECK (
    position >= 0
    AND position < 4
  ),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_option_position UNIQUE (poll_id, position)
);
-- Create poll_votes table
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_vote_per_poll UNIQUE (poll_id, user_id)
);
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_tweet_id ON public.polls(tweet_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes(option_id);
-- Enable Row Level Security
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
-- RLS Policies for polls
CREATE POLICY "Polls are viewable by everyone" ON public.polls FOR
SELECT USING (true);
CREATE POLICY "Users can create polls" ON public.polls FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tweets
      WHERE tweets.id = tweet_id
        AND tweets.author_id = auth.uid()
    )
  );
-- RLS Policies for poll_options
CREATE POLICY "Poll options are viewable by everyone" ON public.poll_options FOR
SELECT USING (true);
CREATE POLICY "Users can create poll options" ON public.poll_options FOR
INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.polls
        JOIN public.tweets ON tweets.id = polls.tweet_id
      WHERE polls.id = poll_id
        AND tweets.author_id = auth.uid()
    )
  );
-- RLS Policies for poll_votes
CREATE POLICY "Poll votes are viewable by everyone" ON public.poll_votes FOR
SELECT USING (true);
CREATE POLICY "Users can vote on polls" ON public.poll_votes FOR
INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own votes" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);
-- Function to increment vote count when a vote is cast
CREATE OR REPLACE FUNCTION increment_poll_vote_count() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.poll_options
SET vote_count = vote_count + 1
WHERE id = NEW.option_id;
RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to decrement vote count when a vote is removed
CREATE OR REPLACE FUNCTION decrement_poll_vote_count() RETURNS TRIGGER AS $$ BEGIN
UPDATE public.poll_options
SET vote_count = vote_count - 1
WHERE id = OLD.option_id;
RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Triggers for vote count management
DROP TRIGGER IF EXISTS trigger_increment_poll_vote ON public.poll_votes;
CREATE TRIGGER trigger_increment_poll_vote
AFTER
INSERT ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION increment_poll_vote_count();
DROP TRIGGER IF EXISTS trigger_decrement_poll_vote ON public.poll_votes;
CREATE TRIGGER trigger_decrement_poll_vote
AFTER DELETE ON public.poll_votes FOR EACH ROW EXECUTE FUNCTION decrement_poll_vote_count();
-- Helper function to get total votes for a poll
CREATE OR REPLACE FUNCTION get_poll_total_votes(poll_uuid UUID) RETURNS INTEGER AS $$
SELECT COALESCE(SUM(vote_count), 0)::INTEGER
FROM public.poll_options
WHERE poll_id = poll_uuid;
$$ LANGUAGE SQL STABLE;
-- Helper function to check if poll has ended
CREATE OR REPLACE FUNCTION is_poll_ended(poll_uuid UUID) RETURNS BOOLEAN AS $$
SELECT ends_at < NOW()
FROM public.polls
WHERE id = poll_uuid;
$$ LANGUAGE SQL STABLE;