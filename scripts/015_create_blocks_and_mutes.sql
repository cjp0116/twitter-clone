-- ========================================
-- Create Blocks and Mutes Tables
-- ========================================

-- Create blocks table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT blocks_blocker_blocked_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self_block CHECK (blocker_id != blocked_id)
);

-- Create mutes table
CREATE TABLE IF NOT EXISTS public.mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  muter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT mutes_muter_muted_unique UNIQUE (muter_id, muted_id),
  CONSTRAINT mutes_no_self_mute CHECK (muter_id != muted_id)
);

-- Enable RLS
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mutes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blocks
-- Users can only read their own blocks
CREATE POLICY "blocks_select_own" ON public.blocks
  FOR SELECT
  USING (auth.uid() = blocker_id);

-- Users can only create their own blocks
CREATE POLICY "blocks_insert_own" ON public.blocks
  FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

-- Users can only delete their own blocks
CREATE POLICY "blocks_delete_own" ON public.blocks
  FOR DELETE
  USING (auth.uid() = blocker_id);

-- RLS Policies for mutes
-- Users can only read their own mutes
CREATE POLICY "mutes_select_own" ON public.mutes
  FOR SELECT
  USING (auth.uid() = muter_id);

-- Users can only create their own mutes
CREATE POLICY "mutes_insert_own" ON public.mutes
  FOR INSERT
  WITH CHECK (auth.uid() = muter_id);

-- Users can only delete their own mutes
CREATE POLICY "mutes_delete_own" ON public.mutes
  FOR DELETE
  USING (auth.uid() = muter_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS blocks_blocker_id_idx ON public.blocks(blocker_id);
CREATE INDEX IF NOT EXISTS blocks_blocked_id_idx ON public.blocks(blocked_id);
CREATE INDEX IF NOT EXISTS blocks_created_at_idx ON public.blocks(created_at DESC);

CREATE INDEX IF NOT EXISTS mutes_muter_id_idx ON public.mutes(muter_id);
CREATE INDEX IF NOT EXISTS mutes_muted_id_idx ON public.mutes(muted_id);
CREATE INDEX IF NOT EXISTS mutes_created_at_idx ON public.mutes(created_at DESC);

-- Helper function to check if user A has blocked user B
CREATE OR REPLACE FUNCTION is_blocked(blocker_user_id UUID, blocked_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.blocks
    WHERE blocker_id = blocker_user_id
      AND blocked_id = blocked_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user A has muted user B
CREATE OR REPLACE FUNCTION is_muted(muter_user_id UUID, muted_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.mutes
    WHERE muter_id = muter_user_id
      AND muted_id = muted_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically unfollow when blocking
CREATE OR REPLACE FUNCTION handle_block_unfollow()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove follow relationship in both directions
  DELETE FROM public.follows
  WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
     OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to unfollow when blocking
DROP TRIGGER IF EXISTS block_unfollow_trigger ON public.blocks;
CREATE TRIGGER block_unfollow_trigger
  AFTER INSERT ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION handle_block_unfollow();

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.blocks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.mutes TO authenticated;
