import { ComposeTweetSkeleton } from "./compose-tweet-skeleton"
import { TweetSkeleton } from "./tweet-skeleton"

export function HomeSkeleton() {
  return (
    <div>
      {/* Compose tweet skeleton */}
      <ComposeTweetSkeleton />

      {/* Timeline feed skeleton */}
      <div className="divide-y divide-border">
        {[1, 2, 3, 4, 5].map((i) => (
          <TweetSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
