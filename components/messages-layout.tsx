"use client"

import { useState } from "react"
import { ConversationList } from "@/components/conversation-list"
import { MessageThread } from "@/components/message-thread"
import { NewMessageDialog } from "@/components/new-message-dialog"
import { Button } from "@/components/ui/button"
import { MessageSquarePlus } from "lucide-react"

interface MessagesLayoutProps {
  user: {
    id: string
    email?: string
  }
}

export function MessagesLayout({ user }: MessagesLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [showNewMessage, setShowNewMessage] = useState(false)

  return (
    <div className="flex h-screen max-h-screen">
      {/* Conversations List */}
      <div className="w-96 border-r border-gray-800 flex flex-col">
        <div className="sticky top-0 bg-black/80 backdrop-blur-md border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Messages</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowNewMessage(true)}>
              <MessageSquarePlus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <ConversationList
          user={user}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Message Thread */}
      <div className="flex-1 flex flex-col">
        {selectedConversationId ? (
          <MessageThread user={user} conversationId={selectedConversationId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquarePlus className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold mb-2">Select a message</h2>
              <p className="text-gray-400">Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* New Message Dialog */}
      <NewMessageDialog
        user={user}
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        onConversationCreated={setSelectedConversationId}
      />
    </div>
  )
}
