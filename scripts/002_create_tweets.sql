-- Create tweets table
create table if not exists public.tweets (
  id uuid primary key default gen_random_uuid(),
  content text not null check (length(content) <= 280),
  author_id uuid not null references auth.users(id) on delete cascade,
  reply_to_id uuid references public.tweets(id) on delete cascade,
  retweet_of_id uuid references public.tweets(id) on delete cascade,
  likes_count integer default 0,
  retweets_count integer default 0,
  replies_count integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.tweets enable row level security;

-- Create policies for tweets
create policy "tweets_select_all" on public.tweets for select using (true);
create policy "tweets_insert_own" on public.tweets for insert with check (auth.uid() = author_id);
create policy "tweets_update_own" on public.tweets for update using (auth.uid() = author_id);
create policy "tweets_delete_own" on public.tweets for delete using (auth.uid() = author_id);

-- Create indexes for performance
create index if not exists tweets_author_id_idx on public.tweets(author_id);
create index if not exists tweets_created_at_idx on public.tweets(created_at desc);
create index if not exists tweets_reply_to_id_idx on public.tweets(reply_to_id);
create index if not exists tweets_retweet_of_id_idx on public.tweets(retweet_of_id);
