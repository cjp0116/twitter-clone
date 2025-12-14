import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect("/auth/login")
  }

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Settings" user={user}>
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
