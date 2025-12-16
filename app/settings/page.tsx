import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"
import { NotificationPreferences } from "@/components/settings/notification-preferences"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
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
        <MainLayout title="Settings" user={user} suggestedUsers={suggestedUsersWithFollowStatus}>
          {/* Settings Content */}
          <div className="p-6 space-y-6">
            {/* Appearance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Theme</h3>
                    <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            {/* Account */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Email</h3>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium">User ID</h3>
                  <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <NotificationPreferences userId={user.id} />

            {/* Privacy & Safety */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Privacy & Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-medium">Data & Privacy</h3>
                  <p className="text-sm text-muted-foreground">Manage your data and privacy settings</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
