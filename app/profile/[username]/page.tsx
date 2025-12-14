import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TweetCard } from "@/components/tweet-card"
import { FollowButton } from "@/components/follow-button"
import { EditProfileButton } from "@/components/edit-profile-button"
import { ProfileContent } from "@/components/profile-content"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { MainLayout } from "@/components/main-layout"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { BlockMuteButton } from "@/components/block-mute-button"

interface ProfilePageProps {
  params: {
    username: string
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  // Fetch profile by username
  console.log("[v0] Looking for profile with username:", params.username)

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", params.username)
    .single()

  console.log("[v0] Profile query result:", { profile, profileError })

  if (profileError) {
    console.error("[v0] Profile error:", profileError)
    // If no profile found, show a user-friendly message instead of notFound()
    if (profileError.code === "PGRST116") {
      return (
        <AuthenticatedLayout>
          <SidebarInset>
            <MainLayout title="Profile" user={user}>
              <Card className="border-0 border-b rounded-none">
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                  <SidebarTrigger className="md:hidden" />
                  <Button asChild variant="ghost" size="sm" className="p-2">
                    <Link href="/">
                      <ArrowLeft className="h-5 w-5" />
                    </Link>
                  </Button>
                  <div>
                    <h1 className="text-xl font-bold">Profile not found</h1>
                  </div>
                </CardHeader>
              </Card>
              <div className="p-8 text-center">
                <h2 className="text-2xl font-bold mb-4">This account doesn't exist</h2>
                <p className="text-muted-foreground mb-6">Try searching for another username.</p>
                <Button asChild>
                  <Link href="/">Go back home</Link>
                </Button>
              </div>
            </MainLayout>
          </SidebarInset>
        </AuthenticatedLayout>
      )
    }
    notFound()
  }

  if (!profile) {
    notFound()
  }

  // Fetch user's own tweets
  const { data: ownTweets, error: tweetsError } = await supabase
    .from("tweets")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      )
    `)
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (tweetsError) {
    console.error("Error fetching tweets:", tweetsError)
  }

  // Fetch tweets where this user is mentioned
  const { data: mentionedTweets, error: mentionedError } = await supabase
    .from("tweets")
    .select(`
      *,
      profiles (
        username,
        display_name,
        avatar_url
      ),
      tweet_mentions!inner (
        mentioned_user_id
      )
    `)
    .eq("tweet_mentions.mentioned_user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(20)

  if (mentionedError) {
    console.error("Error fetching mentioned tweets:", mentionedError)
  }

  // Combine and dedupe tweets (authored + mentioned)
  const tweetsMap = new Map<string, any>()
  for (const t of ownTweets || []) {
    tweetsMap.set(t.id, t)
  }
  for (const t of mentionedTweets || []) {
    tweetsMap.set(t.id, t)
  }
  const combinedTweets = Array.from(tweetsMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  // Check if current user follows this profile
  const { data: followData } = await supabase
    .from("follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", profile.id)
    .single()

  const isFollowing = !!followData
  const isOwnProfile = user.id === profile.id

  // Fetch suggested users
  const { data: suggestedUsers, error: usersError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", user.id)
    .order("followers_count", { ascending: false })
    .limit(5)

  // Check which users the current user is following
  const suggestedUsersWithFollowStatus = await Promise.all(
    (suggestedUsers || []).map(async (suggestedProfile) => {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", suggestedProfile.id)
        .single()

      return {
        id: suggestedProfile.id,
        username: suggestedProfile.username,
        display_name: suggestedProfile.display_name,
        avatar_url: suggestedProfile.avatar_url,
        isFollowing: !!followData,
      }
    })
  )

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title={profile.display_name} user={user} suggestedUsers={suggestedUsersWithFollowStatus}>
          {/* Header */}
          <Card className="border-0 border-b rounded-none">
            <CardHeader className="p-4 flex flex-row items-center gap-4">
              <SidebarTrigger className="md:hidden" />
              <Button asChild variant="ghost" size="sm" className="p-2">
                <Link href="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">{profile.display_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {combinedTweets.length || 0} tweet{combinedTweets.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardHeader>
          </Card>

          {/* Profile Header */}
          <div className="relative">
            {/* Cover Image */}
            <div className="h-48 bg-linear-to-r from-primary/20 to-primary/10"></div>

            {/* Profile Info */}
            <div className="p-4">
              <div className="flex justify-between items-start -mt-16 mb-4">
                <Avatar className="h-32 w-32 border-4 border-background">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {profile.display_name[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="mt-16 flex items-center gap-2">
                  {isOwnProfile ? (
                    <EditProfileButton profile={profile} />
                  ) : (
                    <>
                      <FollowButton targetUserId={profile.id} isFollowing={isFollowing} currentUserId={user.id} />
                      <BlockMuteButton
                        targetUserId={profile.id}
                        targetUsername={profile.username}
                        currentUserId={user.id}
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h2 className="text-2xl font-bold">{profile.display_name}</h2>
                  <p className="text-muted-foreground">@{profile.username}</p>
                </div>

                {profile.bio && <p className="text-foreground leading-relaxed">{profile.bio}</p>}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{profile.following_count}</span>
                    <span className="text-muted-foreground">Following</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{profile.followers_count}</span>
                    <span className="text-muted-foreground">Followers</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tweets & Media Tabs */}
          <div className="border-t border-border">
            <ProfileContent
              tweets={combinedTweets}
              currentUserId={user.id}
              isOwnProfile={isOwnProfile}
              username={profile.username}
              profileId={profile.id}
            />
          </div>
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
