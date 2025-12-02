import { Skeleton } from "@/components/ui/skeleton"

export function ComposeTweetSkeleton() {
  return (
    <div className="p-4 border-b border-border">
      <div className="flex space-x-3">
        {/* Avatar skeleton */}
        <Skeleton className="h-10 w-10 rounded-full" />

        <div className="flex-1 space-y-3">
          {/* Textarea skeleton */}
          <Skeleton className="h-20 w-full rounded-lg" />

          {/* Tweet button skeleton */}
          <div className="flex justify-end">
            <Skeleton className="h-9 w-16 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
