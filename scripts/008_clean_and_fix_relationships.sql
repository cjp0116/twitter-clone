-- Clean up existing data and fix relationships
-- This script ensures data consistency before establishing proper foreign keys

-- First, delete any tweets that don't have corresponding profiles
DELETE FROM tweets 
WHERE author_id NOT IN (SELECT id FROM profiles);

-- Delete any likes that reference non-existent tweets or users
DELETE FROM likes 
WHERE tweet_id NOT IN (SELECT id FROM tweets)
   OR user_id NOT IN (SELECT id FROM profiles);

-- Delete any follows that reference non-existent profiles
DELETE FROM follows 
WHERE follower_id NOT IN (SELECT id FROM profiles)
   OR following_id NOT IN (SELECT id FROM profiles);

-- Now drop the existing foreign key constraint on tweets
ALTER TABLE tweets DROP CONSTRAINT IF EXISTS tweets_author_id_fkey;

-- Add the correct foreign key constraint pointing to profiles
ALTER TABLE tweets 
ADD CONSTRAINT tweets_author_id_fkey 
FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure likes table has proper foreign keys
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_tweet_id_fkey;

ALTER TABLE likes 
ADD CONSTRAINT likes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE likes 
ADD CONSTRAINT likes_tweet_id_fkey 
FOREIGN KEY (tweet_id) REFERENCES tweets(id) ON DELETE CASCADE;

-- Ensure follows table has proper foreign keys
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;

ALTER TABLE follows 
ADD CONSTRAINT follows_follower_id_fkey 
FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE follows 
ADD CONSTRAINT follows_following_id_fkey 
FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update RLS policies to ensure proper access
DROP POLICY IF EXISTS "Users can view all tweets" ON tweets;
CREATE POLICY "Users can view all tweets" ON tweets
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
FOR SELECT USING (true);
