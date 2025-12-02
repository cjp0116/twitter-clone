"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, Smile } from "lucide-react"

interface ComposeTweetProps {
  user: {
    id: string
    email?: string
    user_metadata?: {
      display_name?: string
      username?: string
    }
  }
  onTweetPosted?: () => void
}

export function ComposeTweet({ user, onTweetPosted }: ComposeTweetProps) {
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ id: string } | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("id").eq("id", user.id)

        if (error) {
          console.error("Error fetching profile:", error)
          return
        }

        if (data && data.length > 0) {
          setProfile(data[0])
        } else {
          console.log("[v0] No profile found, creating one for user:", user.id)
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
              display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
            })
            .select("id")

          if (createError) {
            console.error("Error creating profile:", createError)
          } else if (newProfile && newProfile.length > 0) {
            setProfile(newProfile[0])
          }
        }
      } catch (err) {
        console.error("Error in fetchProfile:", err)
      }
    }

    fetchProfile()
  }, [user.id, user.email, user.user_metadata, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > 280 || !profile) return

    setIsPosting(true)
    setError(null)

    try {
      const { error } = await supabase.from("tweets").insert({
        content: content.trim(),
        author_id: profile.id,
      })

      if (error) throw error

      setContent("")
      onTweetPosted?.()
    } catch (error) {
      console.error("Error posting tweet:", error)
      setError("Failed to post tweet. Please try again.")
    } finally {
      setIsPosting(false)
    }
  }

  const characterCount = content.length
  const isOverLimit = characterCount > 280
  const isEmpty = !content.trim()

  const isDisabled = isEmpty || isOverLimit || isPosting || !profile

  return (
    <Card className="border-0 border-b rounded-none">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="/placeholder.svg" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user.user_metadata?.display_name?.[0]?.toUpperCase() ||
                  user.user_metadata?.username?.[0]?.toUpperCase() ||
                  user.email?.[0]?.toUpperCase() ||
                  "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[120px] text-xl border-0 resize-none focus-visible:ring-0 p-0 placeholder:text-xl placeholder:text-muted-foreground"
                maxLength={300}
              />

              {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-2 h-auto"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-2 h-auto"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                      {characterCount}/280
                    </div>
                    <div className="relative h-5 w-5">
                      <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-muted-foreground/20"
                        />
                        <circle
                          cx="10"
                          cy="10"
                          r="8"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 8}`}
                          strokeDashoffset={`${2 * Math.PI * 8 * (1 - characterCount / 280)}`}
                          className={isOverLimit ? "text-destructive" : "text-primary"}
                        />
                      </svg>
                    </div>
                  </div>

                  <Button type="submit" disabled={isDisabled} className="rounded-full px-6">
                    {isPosting ? "Posting..." : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
