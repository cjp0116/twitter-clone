-- Create bookmarks table for tweet bookmarks
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tweet_id uuid not null references public.tweets(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, tweet_id)
);
-- Enable RLS
alter table public.bookmarks enable row level security;
-- Create policies for bookmarks
create policy "bookmarks_select_own" on public.bookmarks for
select using (auth.uid() = user_id);
create policy "bookmarks_insert_own" on public.bookmarks for
insert with check (auth.uid() = user_id);
create policy "bookmarks_delete_own" on public.bookmarks for delete using (auth.uid() = user_id);
-- Create indexes
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists bookmarks_tweet_id_idx on public.bookmarks(tweet_id);
create index if not exists bookmarks_created_at_idx on public.bookmarks(created_at desc);