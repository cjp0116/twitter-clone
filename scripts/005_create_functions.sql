-- Function to update follower/following counts
create or replace function update_follow_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    -- Increment following count for follower
    update public.profiles 
    set following_count = following_count + 1 
    where id = NEW.follower_id;
    
    -- Increment followers count for following
    update public.profiles 
    set followers_count = followers_count + 1 
    where id = NEW.following_id;
    
    return NEW;
  elsif TG_OP = 'DELETE' then
    -- Decrement following count for follower
    update public.profiles 
    set following_count = following_count - 1 
    where id = OLD.follower_id;
    
    -- Decrement followers count for following
    update public.profiles 
    set followers_count = followers_count - 1 
    where id = OLD.following_id;
    
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql;

-- Function to update like counts
create or replace function update_like_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.tweets 
    set likes_count = likes_count + 1 
    where id = NEW.tweet_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.tweets 
    set likes_count = likes_count - 1 
    where id = OLD.tweet_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql;

-- Function to update reply counts
create or replace function update_reply_counts()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.reply_to_id is not null then
    update public.tweets 
    set replies_count = replies_count + 1 
    where id = NEW.reply_to_id;
    return NEW;
  elsif TG_OP = 'DELETE' and OLD.reply_to_id is not null then
    update public.tweets 
    set replies_count = replies_count - 1 
    where id = OLD.reply_to_id;
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql;

-- Create triggers
drop trigger if exists follow_counts_trigger on public.follows;
create trigger follow_counts_trigger
  after insert or delete on public.follows
  for each row execute function update_follow_counts();

drop trigger if exists like_counts_trigger on public.likes;
create trigger like_counts_trigger
  after insert or delete on public.likes
  for each row execute function update_like_counts();

drop trigger if exists reply_counts_trigger on public.tweets;
create trigger reply_counts_trigger
  after insert or delete on public.tweets
  for each row execute function update_reply_counts();
