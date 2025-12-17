import { createClient } from '@/lib/supabase/server'

export interface TrendingHashtag {
  tag: string
  tweet_count: number
}

export async function getTrendingHashtags(limit: number = 5): Promise<TrendingHashtag[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('hashtags')
    .select('tag, tweet_count')
    .order('tweet_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching trending hashtags:', error)
    return []
  }

  return data || []
}