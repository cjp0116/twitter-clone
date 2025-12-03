-- Table to store user mentions in tweets
create table if not exists public.tweet_mentions (
  id uuid primary key default gen_random_uuid(),
  tweet_id uuid not null references public.tweets(id) on delete cascade,
  mentioned_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(tweet_id, mentioned_user_id)
);
-- Enable RLS
alter table public.tweet_mentions enable row level security;
-- Policies: only tweet author can modify mentions for their tweets, everyone can read
drop policy if exists "tweet_mentions_select_all" on public.tweet_mentions;
create policy "tweet_mentions_select_all" on public.tweet_mentions for
select using (true);
drop policy if exists "tweet_mentions_insert_own" on public.tweet_mentions;
create policy "tweet_mentions_insert_own" on public.tweet_mentions for
insert with check (
    auth.uid() in (
      select author_id
      from public.tweets
      where id = tweet_id
    )
  );
drop policy if exists "tweet_mentions_delete_own" on public.tweet_mentions;
create policy "tweet_mentions_delete_own" on public.tweet_mentions for delete using (
  auth.uid() in (
    select author_id
    from public.tweets
    where id = tweet_id
  )
);
-- Indexes for faster lookups
create index if not exists tweet_mentions_tweet_id_idx on public.tweet_mentions(tweet_id);
create index if not exists tweet_mentions_mentioned_user_id_idx on public.tweet_mentions(mentioned_user_id);
-- Notification function for mentions.
-- We reuse the existing 'reply' type so we don't need to alter the notifications type constraint.
drop function if exists public.create_mention_notification() cascade;
create or replace function public.create_mention_notification() returns trigger language plpgsql security definer as $$
declare v_tweet_id uuid;
v_mentioned_user_id uuid;
v_tweet_author_id uuid;
begin -- Get values from NEW record explicitly
v_tweet_id := NEW.tweet_id;
v_mentioned_user_id := NEW.mentioned_user_id;
-- Find the author of the tweet
select author_id into v_tweet_author_id
from public.tweets
where id = v_tweet_id;
-- Don't notify if user somehow mentions themselves or if author not found
if v_tweet_author_id is not null
and v_mentioned_user_id != v_tweet_author_id then
insert into public.notifications (user_id, actor_id, type, tweet_id)
values (
    v_mentioned_user_id,
    v_tweet_author_id,
    'reply',
    v_tweet_id
  );
end if;
return NEW;
end;
$$;
drop trigger if exists tweet_mentions_notification_trigger on public.tweet_mentions;
create trigger tweet_mentions_notification_trigger
after
insert on public.tweet_mentions for each row execute function public.create_mention_notification();