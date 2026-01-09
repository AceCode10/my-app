-- Create class_messages table for student-teacher communication
CREATE TABLE IF NOT EXISTS class_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_class_messages_class_id ON class_messages(class_id);
CREATE INDEX IF NOT EXISTS idx_class_messages_sender_id ON class_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_class_messages_recipient_id ON class_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_class_messages_created_at ON class_messages(created_at DESC);

-- Enable RLS
ALTER TABLE class_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view messages they sent or received
CREATE POLICY "Users can view their own messages"
    ON class_messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can insert messages (must be sender)
CREATE POLICY "Users can send messages"
    ON class_messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Recipients can mark messages as read
CREATE POLICY "Recipients can update message read status"
    ON class_messages FOR UPDATE
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);

-- Senders can delete their own messages
CREATE POLICY "Senders can delete their messages"
    ON class_messages FOR DELETE
    USING (auth.uid() = sender_id);
