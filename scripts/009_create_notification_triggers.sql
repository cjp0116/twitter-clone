-- Create function to create follow notifications
CREATE OR REPLACE FUNCTION create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (
    type,
    actor_id,
    recipient_id,
    read
  ) VALUES (
    'follow',
    NEW.follower_id,
    NEW.following_id,
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to create like notifications
CREATE OR REPLACE FUNCTION create_like_notification()
RETURNS TRIGGER AS $$
DECLARE
  tweet_author_id uuid;
BEGIN
  -- Get the author of the liked tweet
  SELECT author_id INTO tweet_author_id
  FROM public.tweets
  WHERE id = NEW.tweet_id;
  
  -- Only create notification if someone else liked the tweet
  IF tweet_author_id != NEW.user_id THEN
    INSERT INTO public.notifications (
      type,
      actor_id,
      recipient_id,
      tweet_id,
      read
    ) VALUES (
      'like',
      NEW.user_id,
      tweet_author_id,
      NEW.tweet_id,
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to create mention notifications
CREATE OR REPLACE FUNCTION create_mention_notification()
RETURNS TRIGGER AS $$
DECLARE
  mentioned_username text;
  mentioned_user_id uuid;
BEGIN
  -- Extract @mentions from tweet content
  FOR mentioned_username IN
    SELECT regexp_split_to_table(NEW.content, '\s+') AS word
  LOOP
    IF mentioned_username LIKE '@%' THEN
      -- Remove @ symbol and get user ID
      mentioned_username := substring(mentioned_username from 2);
      
      SELECT id INTO mentioned_user_id
      FROM public.profiles
      WHERE username = mentioned_username;
      
      -- Create notification if user exists and it's not self-mention
      IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.author_id THEN
        INSERT INTO public.notifications (
          type,
          actor_id,
          recipient_id,
          tweet_id,
          read
        ) VALUES (
          'mention',
          NEW.author_id,
          mentioned_user_id,
          NEW.id,
          false
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS follow_notification_trigger ON public.follows;
CREATE TRIGGER follow_notification_trigger
  AFTER INSERT ON public.follows
  FOR EACH ROW
  EXECUTE FUNCTION create_follow_notification();

DROP TRIGGER IF EXISTS like_notification_trigger ON public.likes;
CREATE TRIGGER like_notification_trigger
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION create_like_notification();

DROP TRIGGER IF EXISTS mention_notification_trigger ON public.tweets;
CREATE TRIGGER mention_notification_trigger
  AFTER INSERT ON public.tweets
  FOR EACH ROW
  EXECUTE FUNCTION create_mention_notification();
