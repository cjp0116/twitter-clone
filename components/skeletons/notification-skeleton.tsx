import { Skeleton } from "@/components/ui/skeleton"

export function NotificationSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex space-x-3">
        {/* Icon skeleton */}
        <Skeleton className="h-6 w-6 rounded" />

        <div className="flex-1 space-y-2">
          {/* Notification text skeleton */}
          <div className="space-y-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          {/* Time skeleton */}
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Avatar skeleton */}
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    </div>
  )
}
