-- Create a new script that properly handles the foreign key constraint
-- First, we need to check if there are any existing users we can use
-- If not, we'll need to create a user through the auth system first

-- Check for existing users and use one if available
DO $$
DECLARE
    test_user_id uuid;
    existing_user_id uuid;
BEGIN
    -- Try to find an existing user
    SELECT id INTO existing_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- Use existing user ID
        test_user_id := existing_user_id;
        
        -- Insert or update the profile for this user
        INSERT INTO profiles (id, username, display_name, bio, followers_count, following_count)
        VALUES (
            test_user_id,
            'testing',
            'Test User',
            'This is a test profile for development purposes',
            42,
            24
        )
        ON CONFLICT (id) DO UPDATE SET
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            bio = EXCLUDED.bio,
            followers_count = EXCLUDED.followers_count,
            following_count = EXCLUDED.following_count;
            
        -- Add some test tweets
        INSERT INTO tweets (id, author_id, content, likes_count, retweets_count, replies_count, created_at)
        VALUES 
            (gen_random_uuid(), test_user_id, 'Hello Twitter! This is my first tweet 🎉', 5, 2, 1, NOW() - INTERVAL '2 hours'),
            (gen_random_uuid(), test_user_id, 'Just shipped a new feature! Excited to share it with everyone.', 12, 4, 3, NOW() - INTERVAL '1 day'),
            (gen_random_uuid(), test_user_id, 'Beautiful sunset today 🌅 Nature never fails to amaze me.', 8, 1, 2, NOW() - INTERVAL '3 days'),
            (gen_random_uuid(), test_user_id, 'Working on some exciting projects. Stay tuned for updates!', 15, 6, 5, NOW() - INTERVAL '1 week')
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Test profile created successfully with user ID: %', test_user_id;
    ELSE
        RAISE NOTICE 'No existing users found. Please sign up through the app first, then run this script.';
    END IF;
END $$;
