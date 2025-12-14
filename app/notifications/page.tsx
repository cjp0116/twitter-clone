import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotificationsContent } from "@/components/feed/notifications-content"
import { AuthenticatedLayout } from "@/components/auth/authenticated-layout"
import { SidebarInset } from "@/components/ui/sidebar"
import { MainLayout } from "@/components/layout/main-layout"
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

  return (
    <AuthenticatedLayout user={user}>
      <SidebarInset>
        <MainLayout title="Notifications" user={user}>
          <Suspense fallback={<NotificationsSkeleton />}>
            <NotificationsContent user={user} />
          </Suspense>
        </MainLayout>
      </SidebarInset>
    </AuthenticatedLayout>
  )
}
