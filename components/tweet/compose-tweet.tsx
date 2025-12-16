"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ImageIcon, Smile, X, Loader2, BarChart3 } from "lucide-react"
import { PollComposer, type PollData } from '@/components/tweet/poll-composer'
import { PollDisplay } from '@/components/tweet/poll-display'

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

interface MediaFile {
  file: File
  preview: string
  type: "image" | "video"
}

export function ComposeTweet({ user, onTweetPosted }: ComposeTweetProps) {
  const [content, setContent] = useState("")
  const [isPosting, setIsPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{ id: string } | null>(null)
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [showPollComposer, setShowPollComposer] = useState(false)
  const [pollData, setPollData] = useState<PollData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const extractUsernamesFromContent = (text: string): string[] => {
    const regex = /@([A-Za-z0-9_]+)/g
    const usernames = new Set<string>()
    let match
    while ((match = regex.exec(text)) !== null) {
      usernames.add(match[1])
    }
    return Array.from(usernames)
  }

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const remainingSlots = 4 - mediaFiles.length

    if (files.length > remainingSlots) {
      setError(`You can only upload ${4} files maximum`)
      return
    }

    const newMediaFiles: MediaFile[] = []

    files.forEach((file) => {
      if (file.type.startsWith("image/")) {
        const preview = URL.createObjectURL(file)
        newMediaFiles.push({ file, preview, type: "image" })
      } else if (file.type.startsWith("video/")) {
        const preview = URL.createObjectURL(file)
        newMediaFiles.push({ file, preview, type: "video" })
      }
    })

    setMediaFiles((prev) => [...prev, ...newMediaFiles])

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const removeMedia = (index: number) => {
    setMediaFiles((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }

  const uploadMedia = async (): Promise<{ urls: string[]; types: string[] }> => {
    if (mediaFiles.length === 0) {
      return { urls: [], types: [] }
    }

    setUploading(true)

    try {
      const uploadPromises = mediaFiles.map(async (mediaFile) => {
        const fileExt = mediaFile.file.name.split(".").pop()
        const fileName = `${crypto.randomUUID()}.${fileExt}`
        const filePath = `tweets/${fileName}`

        const { error } = await supabase.storage.from("media").upload(filePath, mediaFile.file)

        if (error) {
          console.error("Error uploading file:", error)
          return null
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("media").getPublicUrl(filePath)

        return {
          url: publicUrl,
          type: mediaFile.type,
        }
      })

      const results = await Promise.all(uploadPromises)
      const validResults = results.filter((r) => r !== null) as { url: string; type: string }[]

      const urls = validResults.map((r) => r.url)
      const types = validResults.map((r) => r.type)

      return { urls, types }
    } catch (error) {
      console.error("Error uploading media:", error)
      return { urls: [], types: [] }
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && mediaFiles.length === 0) || content.length > 280 || !profile) return

    setIsPosting(true)
    setError(null)

    try {
      // Upload media first if any
      const { urls: mediaUrls, types: mediaTypes } = await uploadMedia()

      const { data: insertedTweets, error } = await supabase
        .from("tweets")
        .insert({
          content: content.trim() || null,
          author_id: profile.id,
          media_urls: mediaUrls,
          media_types: mediaTypes,
        })
        .select("id, content")

      if (error) throw error

      const insertedTweet = insertedTweets?.[0]

      // Handle mentions after tweet creation
      if (insertedTweet && insertedTweet.content) {
        const usernames = extractUsernamesFromContent(insertedTweet.content)
        if (usernames.length > 0) {
          const { data: mentionedProfiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username")
            .in("username", usernames)

          if (!profilesError && mentionedProfiles && mentionedProfiles.length > 0) {
            const rows = mentionedProfiles
              .filter((p) => p.id !== profile.id)
              .map((p) => ({
                tweet_id: insertedTweet.id,
                mentioned_user_id: p.id,
              }))

            if (rows.length > 0) {
              await supabase.from("tweet_mentions").insert(rows)
            }
          }
        }
      }

      setContent("")
      setMediaFiles([])
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
  const isEmpty = !content.trim() && mediaFiles.length === 0 && !pollData

  const isDisabled = isEmpty || isOverLimit || isPosting || uploading || !profile

  const togglePoll = () => {
    if (showPollComposer) {
      setShowPollComposer(false)
      setPollData(null)
    } else {
      setShowPollComposer(true)
      if (mediaFiles.length > 0) {
        mediaFiles.forEach(media => URL.revokeObjectURL(media.preview))
        setMediaFiles([])
      }
    }
  }

  const getGridClass = () => {
    switch (mediaFiles.length) {
      case 1:
        return "grid-cols-1"
      case 2:
        return "grid-cols-2"
      case 3:
        return "grid-cols-2"
      case 4:
        return "grid-cols-2"
      default:
        return "grid-cols-1"
    }
  }

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
                disabled={isPosting || uploading}
              />

              {/* Media Preview */}
              {mediaFiles.length > 0 && (
                <div className={`grid ${getGridClass()} gap-2 rounded-2xl overflow-hidden`}>
                  {mediaFiles.map((media, index) => (
                    <div
                      key={index}
                      className={`relative group ${mediaFiles.length === 3 && index === 0 ? "row-span-2" : ""
                        } bg-gray-900 rounded-xl overflow-hidden`}
                      style={{ minHeight: mediaFiles.length === 1 ? "300px" : "150px" }}
                    >
                      {media.type === "video" ? (
                        <video src={media.preview} className="w-full h-full object-cover" controls />
                      ) : (
                        <img src={media.preview} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" />
                      )}

                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="absolute top-2 right-2 bg-gray-900/80 hover:bg-gray-900 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={uploading || isPosting}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Poll Composer */}
              {showPollComposer && (
                <PollComposer
                  onPollChange={(poll) => setPollData(poll)}
                  onRemove={() => {
                    setShowPollComposer(false)
                    setPollData(null)
                  }}
                />
              )}

              {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-2 h-auto"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mediaFiles.length >= 4 || uploading || isPosting || showPollComposer}

                    title="Add media"

                  >
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 p-2 h-auto"
                    onClick={togglePoll}
                    disabled={uploading || isPosting || mediaFiles.length > 0}
                    title="Add poll"
                  >
                    <BarChart3 className="h-5 w-5" />
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
                    {uploading ? "Uploading..." : isPosting ? "Posting..." : "Post"}
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
