-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_participants table (many-to-many)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video', 'audio', 'file')),
  reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

-- Configure replica identity to FULL for DELETE events to include all columns
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can only see conversations they're part of
CREATE POLICY "conversations_select_own" ON public.conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "conversations_insert_all" ON public.conversations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "conversations_update_own" ON public.conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
        AND conversation_participants.user_id = auth.uid()
    )
  );

-- RLS Policies for conversation_participants
CREATE POLICY "participants_select_all" ON public.conversation_participants
  FOR SELECT
  USING (true);

CREATE POLICY "participants_insert_all" ON public.conversation_participants
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "participants_update_own" ON public.conversation_participants
  FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "participants_delete_own" ON public.conversation_participants
  FOR DELETE
  USING (user_id = auth.uid());

-- RLS Policies for messages
CREATE POLICY "messages_select_own" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert_own" ON public.messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
        AND conversation_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "messages_update_own" ON public.messages
  FOR UPDATE
  USING (sender_id = auth.uid());

CREATE POLICY "messages_delete_own" ON public.messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- RLS Policies for message_reactions
CREATE POLICY "reactions_select_all" ON public.message_reactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "reactions_insert_own" ON public.message_reactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "reactions_delete_own" ON public.message_reactions
  FOR DELETE
  USING (user_id = auth.uid());

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS conversations_updated_at_idx ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS conversation_participants_user_id_idx ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS conversation_participants_conversation_id_idx ON public.conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_reply_to_id_idx ON public.messages(reply_to_id);

CREATE INDEX IF NOT EXISTS message_reactions_message_id_idx ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS message_reactions_user_id_idx ON public.message_reactions(user_id);

-- Function to update conversation's updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update conversation timestamp
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
CREATE TRIGGER update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();

-- Function to get or create a conversation between two users
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user_id_1 UUID,
  user_id_2 UUID
)
RETURNS UUID AS $$
DECLARE
  conv_id UUID;
BEGIN
  -- Try to find existing conversation between these two users
  SELECT c.id INTO conv_id
  FROM public.conversations c
  WHERE EXISTS (
    SELECT 1
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.conversation_id = c.id
      AND cp1.user_id = user_id_1
      AND cp2.user_id = user_id_2
  )
  AND (
    SELECT COUNT(*) FROM public.conversation_participants cp
    WHERE cp.conversation_id = c.id
  ) = 2
  LIMIT 1;

  -- If no conversation exists, create one
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES
    RETURNING id INTO conv_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES (conv_id, user_id_1), (conv_id, user_id_2);
  END IF;

  RETURN conv_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
