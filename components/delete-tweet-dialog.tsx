"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface DeleteTweetDialogProps {
  tweetId: string
  currentUserId: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onTweetDeleted?: () => void
}

export function DeleteTweetDialog({
  tweetId,
  currentUserId,
  isOpen,
  onOpenChange,
  onTweetDeleted,
}: DeleteTweetDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleDelete = async () => {
    setIsDeleting(true)
    setError(null)

    try {
      const { error } = await supabase.from("tweets").delete().eq("id", tweetId).eq("author_id", currentUserId) // Ensure only owner can delete

      if (error) throw error

      onOpenChange(false)
      onTweetDeleted?.()
    } catch (error) {
      console.error("Error deleting tweet:", error)
      setError("Failed to delete tweet. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete tweet?</DialogTitle>
          <DialogDescription>
            This can't be undone and it will be removed from your profile, the timeline of any accounts that follow you,
            and from search results.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="rounded-full px-6">
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
