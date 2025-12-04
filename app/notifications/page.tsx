import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsContent } from "@/components/notifications-content"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/main-layout"
import { Suspense } from "react";
import { NotificationsSkeleton } from "@/components/skeletons/notifications-skeleton";

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Fetch suggested users
  const { data: suggestedUsers, error: usersError } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .neq("id", user.id)
    .order("followers_count", { ascending: false })
    .limit(5)

  // Check which users the current user is following
  const suggestedUsersWithFollowStatus = await Promise.all(
    (suggestedUsers || []).map(async (profile) => {
      const { data: followData } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .single()

      return {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        isFollowing: !!followData,
      }
    })
  )

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Notifications" user={user} suggestedUsers={suggestedUsersWithFollowStatus}>
          <Suspense fallback={<NotificationsSkeleton />}>
            <NotificationsContent user={user} />
          </Suspense>
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
