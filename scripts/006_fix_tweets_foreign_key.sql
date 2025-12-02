-- Fix the foreign key relationship between tweets and profiles
-- The tweets.author_id should reference profiles.id, not auth.users.id

-- First, drop the existing foreign key constraint
alter table public.tweets drop constraint if exists tweets_author_id_fkey;

-- Add the correct foreign key constraint to reference profiles table
alter table public.tweets add constraint tweets_author_id_fkey 
  foreign key (author_id) references public.profiles(id) on delete cascade;

-- Update any existing tweets that might have auth.users.id as author_id
-- to use the corresponding profiles.id instead (they should be the same)
-- This is a safety measure in case there are existing records
