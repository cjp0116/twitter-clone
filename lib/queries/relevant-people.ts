import { createClient } from "@/lib/supabase/server"

export interface RelevantPerson {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
}

export async function getRelevantPeople(tweetId: string): Promise<RelevantPerson[]> {
  const supabase = await createClient()

  // Get people who liked, retweeted, or replied
  const { data: likers } = await supabase
    .from("likes")
    .select("user_id, profiles(id, username, display_name, avatar_url)")
    .eq("tweet_id", tweetId)
    .limit(5)

  const { data: retweeters } = await supabase
    .from("tweets")
    .select("author_id, profiles(id, username, display_name, avatar_url)")
    .eq("retweet_of_id", tweetId)
    .limit(5)

  const { data: repliers } = await supabase
    .from("tweets")
    .select("author_id, profiles(id, username, display_name, avatar_url)")
    .eq("reply_to_id", tweetId)
    .limit(5)

  // Combine and dedupe
  const peopleMap = new Map()

  likers?.forEach((like: any) => {
    if (like.profiles) {
      peopleMap.set(like.profiles.id, like.profiles)
    }
  })

  retweeters?.forEach((retweet: any) => {
    if (retweet.profiles) {
      peopleMap.set(retweet.profiles.id, retweet.profiles)
    }
  })

  repliers?.forEach((reply: any) => {
    if (reply.profiles) {
      peopleMap.set(reply.profiles.id, reply.profiles)
    }
  })

  return Array.from(peopleMap.values()).slice(0, 5)
}
