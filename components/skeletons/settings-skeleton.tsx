import { Skeleton } from "@/components/ui/skeleton"

export function SettingsSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Settings cards skeleton */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="border border-border rounded-lg">
          {/* Card header */}
          <div className="p-6 pb-4">
            <Skeleton className="h-6 w-32" />
          </div>

          {/* Card content */}
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
