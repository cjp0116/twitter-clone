'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TweetCard } from '@/components/tweet-card'
import { Search, Loader2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface SearchResult {
  tweets: any[]
  users: any[]
}

interface SearchComponentProps {
  currentUserId: string
  currentUser : any
}

export default function SearchComponent({ currentUserId, currentUser }: SearchComponentProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult>({ tweets: [], users: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const supabase = createClient();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults({ tweets: [], users: [] })
      setHasSearched(false)
      return;
    }
    setIsSearching(true)
    setHasSearched(true)
    try {
      const { data: tweets, error: tweetsError } = await supabase.from('tweets').select(`*, profiles (username, display_name, avatar_url)`).ilike(`content`, `%${searchQuery}%`)
        .order(`created_at`, { ascending: false })
        .limit(20)
      
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%,bio.ilike.%${searchQuery}%`)
        .limit(10)
      
      if (tweetsError) throw tweetsError;
      if (usersError) throw usersError;
      
      setResults({ tweets: tweets || [], users: users || [] })

    } catch (error) {
      console.error('Search error:', error);
      setResults({ tweets: [], users: [] })
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
          {results.users.length > 0 && (
            <div>
              <h2 className="text-xl font-bold px-4 mb-3">People</h2>
              <div className="divide-y divide-border">
                {results.users.map((user) => (
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
              </div>
            </div>
          )}

          {/* Tweets Results */}
          {results.tweets.length > 0 && (
            <div>
              <h2 className="text-xl font-bold px-4 mb-3">Tweets</h2>
              <div className="divide-y divide-border">
                {results.tweets.map((tweet) => (
                  <TweetCard
                    key={tweet.id}
                    tweet={tweet}
                    currentUserId={currentUserId}
                    currentUser={currentUser}
                  />
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {results.tweets.length === 0 && results.users.length === 0 && !isSearching && (
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