import { Skeleton } from "@/components/ui/skeleton"
import { TweetSkeleton } from "./tweet-skeleton"

export function ExploreSkeleton() {
  return (
    <div>
      {/* Search bar skeleton */}
      <div className="p-4 border-b border-border">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>

      {/* Trending section skeleton */}
      <div className="border-b border-border">
        <div className="p-4">
          <Skeleton className="h-6 w-32" />
        </div>

        {/* Trending tweets skeleton */}
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <TweetSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
