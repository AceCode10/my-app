'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import { 
  MoreVertical, 
  Mail, 
  Trash2, 
  UserPlus, 
  Copy, 
  Send, 
  Loader2,
  Check,
  X,
  Search,
  ChevronDown
} from 'lucide-react';

interface Student {
  id: string;
  user_id: string;
  class_id: string;
  status: 'active' | 'pending';
  enrolled_at?: string;
  users?: {
    id: string;
    display_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface Teacher {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

interface Invitation {
  id: string;
  invited_email: string;
  status: string;
  created_at: string;
}

interface PeopleTabProps {
  classId: string;
  className: string;
  joinCode: string;
  teacherId: string;
}

export function PeopleTab({ classId, className, joinCode, teacherId }: PeopleTabProps) {
  const supabase = createClient();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  
  // Message modal state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageRecipients, setMessageRecipients] = useState<string[]>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Remove confirmation
  const [studentToRemove, setStudentToRemove] = useState<Student | null>(null);

  useEffect(() => {
    fetchPeople();
  }, [classId]);

  async function fetchPeople() {
    setIsLoading(true);
    
    // Fetch teacher
    const { data: teacherData, error: teacherError } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .eq('id', teacherId)
      .single();
    
    if (teacherError) {
      console.error('Error fetching teacher:', teacherError);
    } else if (teacherData) {
      setTeachers([teacherData]);
    }

    // Fetch students
    const { data: enrollments, error: enrollError } = await supabase
      .from('enrollments')
      .select('*, users(id, display_name, email, avatar_url)')
      .eq('class_id', classId)
      .order('enrolled_at', { ascending: false });

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
    } else if (enrollments) {
      setStudents(enrollments as Student[]);
    }

    // Fetch pending invitations - wrap in try-catch since RLS might block
    try {
      const { data: invites, error: inviteError } = await supabase
        .from('class_invitations')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (inviteError) {
        console.error('Error fetching invitations:', inviteError);
      } else if (invites) {
        setInvitations(invites);
      }
    } catch (err) {
      console.error('Exception fetching invitations:', err);
    }

    setIsLoading(false);
  }

  const activeStudents = students.filter(s => s.status === 'active');
  const pendingStudents = students.filter(s => s.status === 'pending');

  const filteredActiveStudents = activeStudents.filter(student => {
    if (!debouncedSearchQuery) return true;
    const query = debouncedSearchQuery.toLowerCase();
    return (
      student.users?.display_name?.toLowerCase().includes(query) ||
      student.users?.email?.toLowerCase().includes(query)
    );
  });

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredActiveStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredActiveStudents.map(s => s.id)));
    }
  };

  const handleSelectStudent = (enrollmentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(enrollmentId)) {
      newSelected.delete(enrollmentId);
    } else {
      newSelected.add(enrollmentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleCopyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast({ title: 'Copied!', description: `Class code ${joinCode} copied to clipboard.` });
  };

  const handleSendInvites = async () => {
    if (!inviteEmails.trim()) return;
    setIsSendingInvites(true);

    const emailList = inviteEmails
      .split(/[,\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emailList.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Emails', description: 'Please enter valid email addresses.' });
      setIsSendingInvites(false);
      return;
    }

    const uniqueEmails = [...new Set(emailList)];
    let successCount = 0;

    for (const email of uniqueEmails) {
      const { error } = await supabase
        .from('class_invitations')
        .insert({
          class_id: classId,
          invited_email: email,
          invited_by: teacherId,
          status: 'pending'
        });

      if (!error || error.code === '23505') {
        successCount++;
      }
    }

    toast({ 
      title: 'Invitations Sent!', 
      description: `${successCount} invitation(s) sent successfully.` 
    });
    
    setInviteEmails('');
    setShowInviteModal(false);
    setIsSendingInvites(false);
    fetchPeople();
  };

  const handleMessageSelected = () => {
    const recipients = Array.from(selectedStudents)
      .map(id => students.find(s => s.id === id)?.user_id)
      .filter(Boolean) as string[];
    
    setMessageRecipients(recipients);
    setShowMessageModal(true);
  };

  const handleMessageStudent = (userId: string) => {
    setMessageRecipients([userId]);
    setShowMessageModal(true);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || messageRecipients.length === 0) return;
    setIsSendingMessage(true);

    try {
      const messages = messageRecipients.map(recipientId => ({
        class_id: classId,
        sender_id: teacherId,
        recipient_id: recipientId,
        message: messageText.trim(),
        is_read: false
      }));

      const { error } = await supabase
        .from('class_messages')
        .insert(messages);

      if (error) {
        console.error('Error sending message:', error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not send message: ${error.message}` });
      } else {
        toast({ 
          title: 'Message Sent!', 
          description: `Message sent to ${messageRecipients.length} student(s).` 
        });
        setMessageText('');
        setShowMessageModal(false);
        setSelectedStudents(new Set());
        setMessageRecipients([]);
      }
    } catch (err) {
      console.error('Exception sending message:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
    
    setIsSendingMessage(false);
  };

  const handleApproveStudent = async (enrollmentId: string, studentName: string) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'active' })
      .eq('id', enrollmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve student.' });
    } else {
      toast({ title: 'Student Approved', description: `${studentName} has been added to the class.` });
      fetchPeople();
    }
  };

  const handleDeclineStudent = async (enrollmentId: string, studentName: string) => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not decline request.' });
    } else {
      toast({ title: 'Request Declined', description: `${studentName}'s request has been declined.` });
      fetchPeople();
    }
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;

    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', studentToRemove.id);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove student.' });
    } else {
      toast({ title: 'Student Removed', description: 'The student has been removed from the class.' });
      fetchPeople();
    }
    
    setStudentToRemove(null);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('class_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel invitation.' });
    } else {
      toast({ title: 'Invitation Cancelled' });
      fetchPeople();
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Teachers Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Teachers</CardTitle>
            <CardDescription>Class instructors</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teachers.map(teacher => (
              <div key={teacher.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={teacher.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {teacher.display_name?.charAt(0) || 'T'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{teacher.display_name}</p>
                  <p className="text-sm text-muted-foreground">{teacher.email}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Students Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Students</CardTitle>
            <CardDescription>{activeStudents.length} student{activeStudents.length !== 1 ? 's' : ''}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyJoinCode}>
              <Copy className="h-4 w-4 mr-2" />
              Copy join link
            </Button>
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Actions Bar */}
          {activeStudents.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox 
                  checked={selectedStudents.size === filteredActiveStudents.length && filteredActiveStudents.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                {selectedStudents.size > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={handleMessageSelected}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Message{selectedStudents.size > 1 ? 's' : ''}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          )}

          {/* Pending Requests */}
          {pendingStudents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Pending Requests</h4>
              {pendingStudents.map(student => (
                <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.users?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {student.users?.display_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{student.users?.display_name}</p>
                    <p className="text-sm text-muted-foreground">{student.users?.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-green-700 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => handleApproveStudent(student.id, student.users?.display_name || 'Student')}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-red-700 border-red-500/30 hover:bg-red-500/10"
                      onClick={() => handleDeclineStudent(student.id, student.users?.display_name || 'Student')}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Students List */}
          {filteredActiveStudents.length > 0 ? (
            <div className="space-y-1">
              {filteredActiveStudents.map(student => (
                <div key={student.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox 
                    checked={selectedStudents.has(student.id)}
                    onCheckedChange={() => handleSelectStudent(student.id)}
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.users?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {student.users?.display_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{student.users?.display_name}</p>
                    <p className="text-sm text-muted-foreground">{student.users?.email}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMessageStudent(student.user_id)}>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setStudentToRemove(student)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          ) : activeStudents.length > 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching "{searchQuery}"
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No students enrolled yet. Invite students to get started.
            </div>
          )}

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-semibold text-muted-foreground">Pending Invitations ({invitations.length})</h4>
              {invitations.map(invitation => (
                <div key={invitation.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invitation.invited_email}</span>
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => handleCancelInvitation(invitation.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Students</DialogTitle>
            <DialogDescription>
              Enter email addresses (comma or newline separated) to invite students to {className}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="student1@example.com, student2@example.com"
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendInvites} disabled={isSendingInvites}>
                {isSendingInvites ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Invitations
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Message</DialogTitle>
            <DialogDescription>
              Send a message to {messageRecipients.length} student{messageRecipients.length !== 1 ? 's' : ''}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Type your message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={5}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowMessageModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSendMessage} disabled={isSendingMessage}>
                {isSendingMessage ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send Message
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <span className="font-bold">{studentToRemove?.users?.display_name}</span> from the class? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleRemoveStudent}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
