'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TweetCard } from '@/components/tweet/tweet-card'
import { Search, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useInfiniteScroll } from '@/hooks/use-infinite-scroll'
import { useBlockedMuted, filterBlockedMutedTweets } from '@/hooks/use-blocked-muted'

interface SearchResult {
  tweets: any[]
  users: any[]
}

interface SearchComponentProps {
  currentUserId: string
  currentUser: any
}

export function SearchComponent({ currentUserId, currentUser }: SearchComponentProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ tweets: [], users: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreTweets, setHasMoreTweets] = useState(false)
  const [hasMoreUsers, setHasMoreUsers] = useState(false)
  const supabase = createClient()

  // Get blocked and muted users
  const { blockedUserIds, mutedUserIds } = useBlockedMuted(currentUserId)

  // Filter results to exclude blocked/muted users
  const filteredResults = useMemo(() => {
    const excludedIds = new Set([...blockedUserIds, ...mutedUserIds])
    return {
      tweets: filterBlockedMutedTweets(results.tweets, blockedUserIds, mutedUserIds),
      users: results.users.filter((user) => !excludedIds.has(user.id))
    }
  }, [results, blockedUserIds, mutedUserIds])

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ tweets: [], users: [] })
      setHasSearched(false)
      return;
    }
    setIsSearching(true)
    setHasSearched(true)
    try {
      const isHashtagSearch = searchQuery.trim().startsWith('#')
      const tweetSearchTerm = isHashtagSearch ? searchQuery.trim() : `%${searchQuery}%`

      const { data: tweets, error: tweetsError } = await supabase.from('tweets').select(`
        *,
        profiles (username, display_name, avatar_url)
      `).ilike(`content`, isHashtagSearch ? `${tweetSearchTerm}` : tweetSearchTerm)
        .order(`created_at`, { ascending: false })
        .limit(20)

      let users: any[] = []
      if (!isHashtagSearch) {
        const usersResult = await supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
          .limit(10)
        users = usersResult.data || []
        if (usersResult.error) throw usersResult.error
      }

      if (tweetsError) throw tweetsError;

      setResults({ tweets: tweets || [], users })
      setHasMoreTweets((tweets?.length || 0) === 20)
      setHasMoreUsers(users.length === 10)
    } catch (error) {
      console.error('Search error:', error);
      setResults({ tweets: [], users: [] })
      setHasMoreTweets(false)
      setHasMoreUsers(false)
    } finally {
      setIsSearching(false)
    }
  }, [supabase])

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(query) // Debounce the search to prevent unnecessary API calls
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [query, performSearch])

  const loadMoreTweets = useCallback(async () => {
    if (isLoadingMore || !query.trim()) return

    setIsLoadingMore(true)
    try {
      const isHashtagSearch = query.trim().startsWith('#')
      const tweetSearchTerm = isHashtagSearch ? query.trim() : `%${query}%`

      const { data: tweets, error } = await supabase
        .from('tweets')
        .select(`
          *,
          profiles (username, display_name, avatar_url)
        `)
        .ilike('content', isHashtagSearch ? `${tweetSearchTerm}` : tweetSearchTerm)
        .order('created_at', { ascending: false })
        .range(results.tweets.length, results.tweets.length + 19)

      if (error) throw error

      setResults(prev => ({ ...prev, tweets: [...prev.tweets, ...(tweets || [])] }))
      setHasMoreTweets((tweets?.length || 0) === 20)
    } catch (error) {
      console.error('Error loading more tweets:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [supabase, query, results.tweets.length, isLoadingMore])

  const loadMoreUsers = useCallback(async () => {
    if (isLoadingMore || !query.trim() || query.trim().startsWith('#')) return

    setIsLoadingMore(true)
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,bio.ilike.%${query}%`)
        .range(results.users.length, results.users.length + 9)

      if (error) throw error

      setResults(prev => ({ ...prev, users: [...prev.users, ...(users || [])] }))
      setHasMoreUsers((users?.length || 0) === 10)
    } catch (error) {
      console.error('Error loading more users:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [supabase, query, results.users.length, isLoadingMore])

  const loadMoreTweetsRef = useInfiniteScroll({
    onLoadMore: loadMoreTweets,
    isLoading: isLoadingMore,
    hasMore: hasMoreTweets,
  })

  const loadMoreUsersRef = useInfiniteScroll({
    onLoadMore: loadMoreUsers,
    isLoading: isLoadingMore,
    hasMore: hasMoreUsers,
  })

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="p-4 border-b border-border sticky top-16 bg-background/80 backdrop-blur-md z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Twitter"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 bg-muted/50 border-0 focus-visible:ring-1"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="space-y-6">
          {/* Users Results */}
          {filteredResults.users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold px-4 mb-3">People</h2>
              <div className="divide-y divide-border">
                {filteredResults.users.map((user) => (
                  <Link
                    key={user.id}
                    href={`/profile/${user.username}`}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user.display_name[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                        {user.bio && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">{user.followers_count}</span> followers
                    </div>
                  </Link>
                ))}
                {hasMoreUsers && (
                  <div ref={loadMoreUsersRef} className="p-4 flex justify-center">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading more users...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tweets Results */}
          {filteredResults.tweets.length > 0 && (
            <div>
              <h2 className="text-xl font-bold px-4 mb-3">Tweets</h2>
              <div className="divide-y divide-border">
                {filteredResults.tweets.map((tweet) => (
                  <TweetCard
                    key={tweet.id}
                    tweet={tweet}
                    currentUserId={currentUserId}
                    currentUser={currentUser}
                  />
                ))}
                {hasMoreTweets && (
                  <div ref={loadMoreTweetsRef} className="p-4 flex justify-center">
                    {isLoadingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading more tweets...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredResults.tweets.length === 0 && filteredResults.users.length === 0 && !isSearching && (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg mb-2">No results for "{query}"</p>
              <p className="text-sm">Try searching for something else</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}