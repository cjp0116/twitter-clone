-- Add a test profile with username "testing"
INSERT INTO profiles (
  id,
  username,
  display_name,
  bio,
  avatar_url,
  followers_count,
  following_count,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'testing',
  'Test User',
  'This is a test profile for development purposes. 🚀',
  '/placeholder.svg?height=128&width=128',
  42,
  24,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Add some test tweets for the test profile
WITH test_profile AS (
  SELECT id FROM profiles WHERE username = 'testing'
)
INSERT INTO tweets (
  id,
  author_id,
  content,
  likes_count,
  retweets_count,
  replies_count,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  test_profile.id,
  content,
  0,
  0,
  0,
  NOW() - (interval '1 hour' * row_number),
  NOW() - (interval '1 hour' * row_number)
FROM test_profile,
(VALUES 
  ('Hello Twitter! This is my first tweet 👋'),
  ('Just shipped a new feature! Excited to share it with everyone 🚀'),
  ('Beautiful sunset today. Sometimes you need to stop and appreciate the little things 🌅'),
  ('Working on some exciting projects. Can''t wait to share more details soon! 💻'),
  ('Coffee and code - the perfect combination ☕️👨‍💻')
) AS tweet_data(content)
CROSS JOIN (SELECT row_number() OVER () as row_number FROM generate_series(1,5)) AS rn;
