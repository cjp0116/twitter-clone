import { Skeleton } from "@/components/ui/skeleton"

export function TweetSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex space-x-3">
        {/* Avatar skeleton */}
        <Skeleton className="h-10 w-10 rounded-full" />

        <div className="flex-1 space-y-2">
          {/* User info skeleton */}
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Tweet content skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>

          {/* Action buttons skeleton */}
          <div className="flex items-center justify-between pt-2 max-w-md">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}
