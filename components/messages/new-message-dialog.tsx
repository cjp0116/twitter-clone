"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Search, Loader2 } from "lucide-react"

interface User {
  id: string
  username: string
  display_name: string
  avatar_url?: string
}

interface NewMessageDialogProps {
  user: {
    id: string
    email?: string
  }
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationCreated: (conversationId: string) => void
}

export function NewMessageDialog({ user, open, onOpenChange, onConversationCreated }: NewMessageDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers()
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

  const searchUsers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .neq("id", user.id)
      .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(10)

    if (error) {
      console.error("Error searching users:", error)
    } else {
      setSearchResults(data || [])
    }

    setLoading(false)
  }

  const createConversation = async (otherUserId: string) => {
    setCreating(true)

    try {
      // Call the get_or_create_conversation function
      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        user_id_1: user.id,
        user_id_2: otherUserId,
      })

      if (error) {
        console.error("Error creating conversation:", error)
      } else if (data) {
        onConversationCreated(data)
        onOpenChange(false)
        setSearchQuery("")
        setSearchResults([])
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="pl-10"
            />
          </div>

          {/* Search results */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
              </div>
            ) : searchResults.length === 0 && searchQuery.trim() ? (
              <div className="text-center py-8 text-gray-500">
                <p>No users found</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Search for someone to start a conversation</p>
              </div>
            ) : (
              searchResults.map((searchUser) => (
                <button
                  key={searchUser.id}
                  onClick={() => createConversation(searchUser.id)}
                  disabled={creating}
                  className="w-full p-3 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 text-left"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={searchUser.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback className="bg-gray-600 text-white">
                      {searchUser.display_name?.[0]?.toUpperCase() || searchUser.username?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{searchUser.display_name}</p>
                    <p className="text-sm text-gray-400 truncate">@{searchUser.username}</p>
                  </div>
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
