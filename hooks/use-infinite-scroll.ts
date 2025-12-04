import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  onLoadMore: () => void
  isLoading: boolean
  hasMore: boolean
  threshold?: number // Distance from bottom to trigger (0-1) 0 means when element is visible
  rootMargin?: string
}

/**

 * Hook for implementing infinite scroll using Intersection Observer

 *

 * @param options Configuration options for infinite scroll

 * @returns Ref to attach to the trigger element (usually the last item or load more indicator)

 *

 * @example

 * ```tsx

 * const loadMoreRef = useInfiniteScroll({

 *   onLoadMore: loadMoreItems,

 *   isLoading,

 *   hasMore

 * })

 *

 * return (

 *   <div>

 *     {items.map(item => <Item key={item.id} {...item} />)}

 *     {hasMore && <div ref={loadMoreRef}>Loading...</div>}

 *   </div>

 * )

 * ```

 */

export function useInfiniteScroll({
  onLoadMore,
  isLoading,
  hasMore,
  threshold = 0,
  rootMargin = '100px'
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries
    if (target.isIntersecting && hasMore && !isLoading) {
      onLoadMore()
    }
  }, [onLoadMore, hasMore, isLoading]);
  
  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) return
    observerRef.current = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin,
      threshold,
    })
    observerRef.current.observe(element)
    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element)
      }
    }
  }, [handleObserver, threshold, rootMargin])

  return loadMoreRef
}
