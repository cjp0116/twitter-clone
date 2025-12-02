-- Create likes table for tweet likes
create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tweet_id uuid not null references public.tweets(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, tweet_id)
);

-- Enable RLS
alter table public.likes enable row level security;

-- Create policies for likes
create policy "likes_select_all" on public.likes for select using (true);
create policy "likes_insert_own" on public.likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on public.likes for delete using (auth.uid() = user_id);

-- Create indexes
create index if not exists likes_user_id_idx on public.likes(user_id);
create index if not exists likes_tweet_id_idx on public.likes(tweet_id);
