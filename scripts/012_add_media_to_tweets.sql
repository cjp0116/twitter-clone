-- Add media fields to tweets table
ALTER TABLE public.tweets
ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS media_types TEXT[] DEFAULT '{}';

-- Create index for media queries
CREATE INDEX IF NOT EXISTS tweets_media_urls_idx ON public.tweets USING GIN (media_urls) WHERE array_length(media_urls, 1) > 0;

-- Add comment for documentation
COMMENT ON COLUMN public.tweets.media_urls IS 'Array of media URLs (images, videos, gifs)';
COMMENT ON COLUMN public.tweets.media_types IS 'Array of media types corresponding to media_urls (image, video, gif)';
