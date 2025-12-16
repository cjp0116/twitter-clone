import { useEffect, useRef, useCallback } from "react"

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  isLoading: boolean
  hasMore: boolean
  threshold?: number // Distance from bottom to trigger (0-1), default 0 means when element is visible
  rootMargin?: string // Margin around root, default "0px"
}

export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 0,
  rootMargin = "100px", // Trigger 100px before reaching the element
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries
      if (target.isIntersecting && hasMore && !isLoading) {
        onLoadMore()
      }
    },
    [onLoadMore, hasMore, isLoading],
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return

    // Create observer
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null, // Use viewport as root
      rootMargin,
      threshold,
    })

    // Start observing
    observerRef.current.observe(element)

    // Cleanup
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [handleObserver, threshold, rootMargin])

  return loadMoreRef
}
