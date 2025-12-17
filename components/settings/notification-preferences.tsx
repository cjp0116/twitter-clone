"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Bell, Heart, Repeat2, MessageCircle, UserPlus, AtSign, Quote, Mail } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface NotificationPreferences {
  likes_enabled: boolean
  retweets_enabled: boolean
  replies_enabled: boolean
  follows_enabled: boolean
  mentions_enabled: boolean
  quote_tweets_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
}

interface NotificationPreferencesProps {
  userId: string
}

export default function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    likes_enabled: true,
    retweets_enabled: true,
    replies_enabled: true,
    follows_enabled: true,
    mentions_enabled: true,
    quote_tweets_enabled: true,
    email_notifications: false,
    push_notifications: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchPreferences()
  }, [userId])

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setPreferences({
          likes_enabled: data.likes_enabled,
          retweets_enabled: data.retweets_enabled,
          replies_enabled: data.replies_enabled,
          follows_enabled: data.follows_enabled,
          mentions_enabled: data.mentions_enabled,
          quote_tweets_enabled: data.quote_tweets_enabled,
          email_notifications: data.email_notifications,
          push_notifications: data.push_notifications,
        })
      }
    } catch (error) {
      console.error("Error fetching preferences:", error)
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    setSaving(true)
    try {
      const updatedPreferences = { ...preferences, [key]: value }
      setPreferences(updatedPreferences)

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(
          {
            user_id: userId,
            ...updatedPreferences,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )

      if (error) throw error

      toast({
        title: "Saved",
        description: "Notification preferences updated",
      })
    } catch (error) {
      console.error("Error updating preferences:", error)
      // Revert the change on error
      setPreferences(preferences)
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>Choose what notifications you want to receive</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interaction Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Interactions
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="likes" className="text-base cursor-pointer">
                  Likes
                </Label>
                <p className="text-sm text-muted-foreground">When someone likes your tweet</p>
              </div>
            </div>
            <Switch
              id="likes"
              checked={preferences.likes_enabled}
              onCheckedChange={(checked) => updatePreference("likes_enabled", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Repeat2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="retweets" className="text-base cursor-pointer">
                  Retweets
                </Label>
                <p className="text-sm text-muted-foreground">When someone retweets your tweet</p>
              </div>
            </div>
            <Switch
              id="retweets"
              checked={preferences.retweets_enabled}
              onCheckedChange={(checked) => updatePreference("retweets_enabled", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Quote className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="quotes" className="text-base cursor-pointer">
                  Quote Tweets
                </Label>
                <p className="text-sm text-muted-foreground">When someone quotes your tweet</p>
              </div>
            </div>
            <Switch
              id="quotes"
              checked={preferences.quote_tweets_enabled}
              onCheckedChange={(checked) => updatePreference("quote_tweets_enabled", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="replies" className="text-base cursor-pointer">
                  Replies
                </Label>
                <p className="text-sm text-muted-foreground">When someone replies to your tweet</p>
              </div>
            </div>
            <Switch
              id="replies"
              checked={preferences.replies_enabled}
              onCheckedChange={(checked) => updatePreference("replies_enabled", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AtSign className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="mentions" className="text-base cursor-pointer">
                  Mentions
                </Label>
                <p className="text-sm text-muted-foreground">When someone mentions you</p>
              </div>
            </div>
            <Switch
              id="mentions"
              checked={preferences.mentions_enabled}
              onCheckedChange={(checked) => updatePreference("mentions_enabled", checked)}
              disabled={saving}
            />
          </div>
        </div>

        <Separator />

        {/* Social Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Social</h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="follows" className="text-base cursor-pointer">
                  New Followers
                </Label>
                <p className="text-sm text-muted-foreground">When someone follows you</p>
              </div>
            </div>
            <Switch
              id="follows"
              checked={preferences.follows_enabled}
              onCheckedChange={(checked) => updatePreference("follows_enabled", checked)}
              disabled={saving}
            />
          </div>
        </div>

        <Separator />

        {/* Delivery Methods */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Delivery
          </h3>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="push" className="text-base cursor-pointer">
                  Push Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Receive push notifications</p>
              </div>
            </div>
            <Switch
              id="push"
              checked={preferences.push_notifications}
              onCheckedChange={(checked) => updatePreference("push_notifications", checked)}
              disabled={saving}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="email" className="text-base cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Receive email notifications</p>
              </div>
            </div>
            <Switch
              id="email"
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreference("email_notifications", checked)}
              disabled={saving}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
