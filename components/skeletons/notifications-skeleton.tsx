import { Skeleton } from "@/components/ui/skeleton"
import { NotificationSkeleton } from "./notification-skeleton"

export function NotificationsSkeleton() {
  return (
    <div>
      {/* Tab navigation skeleton */}
      <div className="flex border-b border-border">
        {["All", "Verified", "Mentions"].map((tab) => (
          <div key={tab} className="flex-1 p-4 text-center">
            <Skeleton className="h-4 w-16 mx-auto" />
          </div>
        ))}
      </div>

      {/* Notifications list skeleton */}
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <NotificationSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
