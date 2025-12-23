import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"
import { HashtagFeed } from "@/components/feed/hashtag-feed"
import { normalizeHashtag } from "@/lib/utils/hashtags"

interface HashtagPageProps {
  params: Promise<{
    tag: string
  }>
}

export default async function HashtagPage({ params }: HashtagPageProps) {
  const { tag } = await params
  const normalizedTag = normalizeHashtag(decodeURIComponent(tag))

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch hashtag stats
  const { data: hashtagData, error: hashtagError } = await supabase
    .from("hashtags")
    .select("tag, tweet_count, created_at")
    .eq("tag", normalizedTag)
    .maybeSingle()

  if (hashtagError) {
    return (
      <AuthenticatedLayout user={user}>
        <SidebarInset>
          <MainLayout title={`#${normalizedTag}`} user={user} showBackButton>
            <div className="p-4">
              <p className="text-destructive">Unable to load hashtag data. Please try again later.</p>
            </div>
          </MainLayout>
        </SidebarInset>
      </AuthenticatedLayout>
    )
  }

  const tweetCount = hashtagData?.tweet_count || 0

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout
          title={`#${normalizedTag}`}
          user={user}
          showBackButton
        >
          <div className="border-b p-4 space-y-2">
            <h1 className="text-2xl font-bold">#{normalizedTag}</h1>
            <p className="text-muted-foreground text-sm">
              {tweetCount} {tweetCount === 1 ? "post" : "posts"}
            </p>
          </div>
          <HashtagFeed tag={normalizedTag} currentUserId={user.id} />
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
