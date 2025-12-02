-- Ensure profiles table has proper RLS policies for joins to work
-- Add policy to allow reading profiles when joining with tweets

-- Allow reading profiles for tweet display (needed for joins)
drop policy if exists "profiles_select_for_tweets" on public.profiles;
create policy "profiles_select_for_tweets" on public.profiles 
  for select using (true);

-- Keep the existing policy for users to manage their own profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles 
  for select using (auth.uid() = id);

-- Combine into a single policy that allows both cases
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles 
  for select using (true);
