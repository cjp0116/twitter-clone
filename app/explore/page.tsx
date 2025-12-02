import { Input } from "@/components/ui/input"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TweetCard } from "@/components/tweet-card"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { Search } from "lucide-react"
import { MainLayout } from "@/components/main-layout"

export default async function ExplorePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch trending tweets (most liked in last 24 hours)
  const { data: trendingTweets, error: trendingError } = await supabase
    .from("tweets")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("likes_count", { ascending: false })
    .limit(10)

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Explore" user={user}>
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search Twitter" className="pl-10 bg-muted/50 border-0 focus-visible:ring-1" />
            </div>
          </div>

          {/* Trending */}
          <div className="border-b border-border">
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Trending now</h2>
            </div>
            <div className="divide-y divide-border">
              {trendingTweets && trendingTweets.length > 0 ? (
                trendingTweets.map((tweet) => (
                  <TweetCard key={tweet.id} tweet={tweet} currentUserId={user.id} currentUser={user} />
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  <p>No trending tweets right now</p>
                </div>
              )}
            </div>
          </div>
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
