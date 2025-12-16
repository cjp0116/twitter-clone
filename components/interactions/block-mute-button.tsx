"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Ban, VolumeX, UserMinus, Volume2, UserPlus } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface BlockMuteButtonProps {
  targetUserId: string
  targetUsername: string
  currentUserId: string
  onUpdate?: () => void
}

export function BlockMuteButton({ targetUserId, targetUsername, currentUserId, onUpdate }: BlockMuteButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [showUnblockDialog, setShowUnblockDialog] = useState(false)
  const supabase = createClient()

  // Check block and mute status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Check if blocked
        const { data: blockData } = await supabase
          .from("blocks")
          .select("id")
          .eq("blocker_id", currentUserId)
          .eq("blocked_id", targetUserId)
          .maybeSingle()

        setIsBlocked(!!blockData)

        // Check if muted
        const { data: muteData } = await supabase
          .from("mutes")
          .select("id")
          .eq("muter_id", currentUserId)
          .eq("muted_id", targetUserId)
          .maybeSingle()

        setIsMuted(!!muteData)
      } catch (error) {
        console.error("Error checking block/mute status:", error)
      }
    }

    checkStatus()
  }, [supabase, currentUserId, targetUserId])

  const handleBlock = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.from("blocks").insert({
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      })

      if (!error) {
        setIsBlocked(true)
        setShowBlockDialog(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error("Error blocking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnblock = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", targetUserId)

      if (!error) {
        setIsBlocked(false)
        setShowUnblockDialog(false)
        onUpdate?.()
      }
    } catch (error) {
      console.error("Error unblocking user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMute = async () => {
    setIsLoading(true)
    try {
      if (isMuted) {
        // Unmute
        const { error } = await supabase
          .from("mutes")
          .delete()
          .eq("muter_id", currentUserId)
          .eq("muted_id", targetUserId)

        if (!error) {
          setIsMuted(false)
          onUpdate?.()
        }
      } else {
        // Mute
        const { error } = await supabase.from("mutes").insert({
          muter_id: currentUserId,
          muted_id: targetUserId,
        })

        if (!error) {
          setIsMuted(true)
          onUpdate?.()
        }
      }
    } catch (error) {
      console.error("Error toggling mute:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleMute} disabled={isLoading || isBlocked}>
            {isMuted ? (
              <>
                <Volume2 className="h-4 w-4 mr-2" />
                Unmute @{targetUsername}
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 mr-2" />
                Mute @{targetUsername}
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {isBlocked ? (
            <DropdownMenuItem
              onClick={() => setShowUnblockDialog(true)}
              disabled={isLoading}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Unblock @{targetUsername}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => setShowBlockDialog(true)}
              disabled={isLoading}
              className="text-destructive focus:text-destructive"
            >
              <Ban className="h-4 w-4 mr-2" />
              Block @{targetUsername}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block @{targetUsername}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>They will not be able to:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>See your tweets or profile</li>
                <li>Follow you or interact with your tweets</li>
                <li>Send you direct messages</li>
              </ul>
              <p className="mt-2">You will also unfollow each other.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Blocking..." : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unblock Confirmation Dialog */}
      <AlertDialog open={showUnblockDialog} onOpenChange={setShowUnblockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock @{targetUsername}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be able to see your tweets and interact with you again. You can re-block them at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock} disabled={isLoading}>
              {isLoading ? "Unblocking..." : "Unblock"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
