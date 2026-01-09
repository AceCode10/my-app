-- Class Invitations Table
-- Allows teachers to invite students by email to join their classes

CREATE TABLE IF NOT EXISTS class_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    invited_email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(class_id, invited_email)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_class_invitations_class_id ON class_invitations(class_id);
CREATE INDEX IF NOT EXISTS idx_class_invitations_invited_email ON class_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_class_invitations_status ON class_invitations(status);

-- Enable RLS
ALTER TABLE class_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for class_invitations

-- Teachers can view invitations for their classes
CREATE POLICY "Teachers can view invitations for their classes"
ON class_invitations FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_invitations.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

-- Students can view invitations sent to their email
CREATE POLICY "Students can view their own invitations"
ON class_invitations FOR SELECT
TO authenticated
USING (
    invited_email = (SELECT email FROM users WHERE id = auth.uid())
);

-- Teachers can create invitations for their classes
CREATE POLICY "Teachers can create invitations for their classes"
ON class_invitations FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_invitations.class_id 
        AND classes.teacher_id = auth.uid()
    )
    AND invited_by = auth.uid()
);

-- Teachers can delete invitations for their classes
CREATE POLICY "Teachers can delete invitations for their classes"
ON class_invitations FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM classes 
        WHERE classes.id = class_invitations.class_id 
        AND classes.teacher_id = auth.uid()
    )
);

-- Students can update invitations sent to them (to accept/decline)
CREATE POLICY "Students can respond to their invitations"
ON class_invitations FOR UPDATE
TO authenticated
USING (
    invited_email = (SELECT email FROM users WHERE id = auth.uid())
)
WITH CHECK (
    invited_email = (SELECT email FROM users WHERE id = auth.uid())
    AND status IN ('accepted', 'declined')
);

-- Function to auto-enroll student when invitation is accepted
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Get the user_id from the email
        INSERT INTO enrollments (user_id, class_id, status, enrolled_at)
        SELECT u.id, NEW.class_id, 'active', NOW()
        FROM users u
        WHERE u.email = NEW.invited_email
        ON CONFLICT (user_id, class_id) DO UPDATE SET status = 'active';
        
        NEW.responded_at = NOW();
    ELSIF NEW.status = 'declined' AND OLD.status = 'pending' THEN
        NEW.responded_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-enrollment on acceptance
DROP TRIGGER IF EXISTS on_invitation_response ON class_invitations;
CREATE TRIGGER on_invitation_response
    BEFORE UPDATE ON class_invitations
    FOR EACH ROW
    EXECUTE FUNCTION handle_invitation_acceptance();
