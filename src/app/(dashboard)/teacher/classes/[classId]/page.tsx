'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, BarChart, FileText, Settings, Trash2, Loader2, Copy, Mail, X, Send, UserPlus, Clock, ClipboardList, MessageSquare, Plus, MoreVertical, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { PeopleTab } from '@/components/teacher/people-tab';
import { AnnouncementsTab } from '@/components/teacher/announcements-tab';
import { ThreadedMessages } from '@/components/teacher/threaded-messages';

interface ClassData {
  id: string;
  name: string;
  subject_id: string;
  teacher_id: string;
  join_code: string;
  capacity: number;
  created_at: string;
  subjects?: { name: string };
}

interface Student {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  xp?: number;
}

interface Enrollment {
  id: string;
  user_id: string;
  class_id: string;
  status: 'active' | 'pending';
  users?: Student;
}

interface Invitation {
  id: string;
  class_id: string;
  invited_email: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  expires_at: string;
}

interface Assignment {
  id: string;
  title: string;
  test_id: string;
  target_class_id: string;
  due_at: string;
  created_at: string;
  tests?: { title: string; total_questions: number; total_marks: number };
}

interface Message {
  id: string;
  class_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  sender?: { display_name: string };
}

function StudentList({ 
  enrollments, 
  title, 
  onRemove,
  onMessage,
  isPending = false,
  onApprove,
  onDecline
}: { 
  enrollments: Enrollment[];
  title: string;
  onRemove?: (enrollmentId: string) => void;
  onMessage?: (studentId: string, studentName: string) => void;
  isPending?: boolean;
  onApprove?: (enrollmentId: string, studentName: string) => void;
  onDecline?: (enrollmentId: string, studentName: string) => void;
}) {
  const [studentToRemove, setStudentToRemove] = useState<Enrollment | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter students based on search query
  const filteredEnrollments = enrollments.filter(enrollment => {
    const student = enrollment.users;
    if (!student) return false;
    const query = searchQuery.toLowerCase();
    return (
      student.display_name?.toLowerCase().includes(query) ||
      student.email?.toLowerCase().includes(query)
    );
  });

  if (enrollments.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No students in this list.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-foreground">{title} ({enrollments.length})</h4>
          {enrollments.length > 3 && (
            <div className="relative w-64">
              <Input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-3"
              />
            </div>
          )}
        </div>
        {filteredEnrollments.length === 0 ? (
          <div className="border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">No students found matching "{searchQuery}"</p>
          </div>
        ) : (
          <div className="border rounded-lg divide-y">
            {filteredEnrollments.map((enrollment) => {
              const student = enrollment.users;
              if (!student) return null;
              
              return (
                <div 
                  key={enrollment.id} 
                  className={`flex items-center justify-between p-4 hover:bg-muted/50 transition-colors ${
                    isPending ? 'bg-yellow-400/5' : ''
                  }`}
                >
                <div className="flex items-center space-x-4 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {student.display_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{student.display_name}</p>
                    <p className="text-xs text-muted-foreground">{student.email}</p>
                  </div>
                  {!isPending && (
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
                      <span className="text-xs text-muted-foreground">XP:</span>
                      <span className="text-sm font-semibold text-foreground">{student.xp?.toLocaleString() || 0}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {isPending && onApprove && onDecline ? (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-green-700 border-green-500/30 hover:bg-green-500/10"
                        onClick={() => onApprove(enrollment.id, student.display_name || 'Student')}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-700 border-red-500/30 hover:bg-red-500/10"
                        onClick={() => onDecline(enrollment.id, student.display_name || 'Student')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </>
                  ) : (
                    <div className="relative">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setOpenMenuId(openMenuId === enrollment.id ? null : enrollment.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      
                      {openMenuId === enrollment.id && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setOpenMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-popover border rounded-lg shadow-lg z-50 py-1">
                            {onMessage && (
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => {
                                  onMessage(student.id, student.display_name || 'Student');
                                  setOpenMenuId(null);
                                }}
                              >
                                <MessageSquare className="h-4 w-4" />
                                Send Message
                              </button>
                            )}
                            {onRemove && (
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                                onClick={() => {
                                  setStudentToRemove(enrollment);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove Student
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
      
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
              onClick={() => {
                if (onRemove && studentToRemove) {
                  onRemove(studentToRemove.id);
                }
                setStudentToRemove(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function InviteStudents({
  classId,
  invitations,
  onInviteSent,
  onCancelInvite
}: {
  classId: string;
  invitations: Invitation[];
  onInviteSent: () => void;
  onCancelInvite: (invitationId: string) => void;
}) {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [emails, setEmails] = useState('');
  const [isSending, setIsSending] = useState(false);

  const pendingInvitations = invitations.filter(i => i.status === 'pending');

  const handleSendInvites = async () => {
    if (!emails.trim() || !user) return;
    setIsSending(true);

    // Parse emails (comma, newline, or space separated)
    const emailList = emails
      .split(/[,\n\s]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emailList.length === 0) {
      toast({ variant: 'destructive', title: 'Invalid Emails', description: 'Please enter valid email addresses.' });
      setIsSending(false);
      return;
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(emailList)];
    
    let successCount = 0;
    let errorCount = 0;

    for (const email of uniqueEmails) {
      const { error } = await supabase
        .from('class_invitations')
        .insert({
          class_id: classId,
          invited_email: email,
          invited_by: user.id,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          // Already invited, skip
        } else {
          errorCount++;
        }
      } else {
        successCount++;
      }
    }

    if (successCount > 0) {
      toast({ 
        title: 'Invitations Sent', 
        description: `${successCount} invitation${successCount > 1 ? 's' : ''} sent successfully.` 
      });
      setEmails('');
      onInviteSent();
    }
    if (errorCount > 0) {
      toast({ 
        variant: 'destructive', 
        title: 'Some Invitations Failed', 
        description: `${errorCount} invitation${errorCount > 1 ? 's' : ''} could not be sent.` 
      });
    }

    setIsSending(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Invite Students by Email
        </CardTitle>
        <CardDescription>
          Send email invitations to students. They can accept or decline from their dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="emails">Email Addresses</Label>
          <Textarea
            id="emails"
            placeholder="Enter email addresses (one per line or comma-separated)"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Tip: You can paste multiple emails separated by commas or new lines.
          </p>
        </div>
        <Button onClick={handleSendInvites} disabled={isSending || !emails.trim()}>
          {isSending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Invitations
        </Button>

        {pendingInvitations.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="font-semibold text-sm mb-3">Pending Invitations ({pendingInvitations.length})</h4>
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div 
                  key={invitation.id} 
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invitation.invited_email}</span>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => onCancelInvite(invitation.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassAssignments({ classId }: { classId: string }) {
  const supabase = createClient();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      const { data, error } = await supabase
        .from('assignments')
        .select('*, tests(title, total_questions, total_marks)')
        .eq('target_class_id', classId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assignments:', error);
      } else {
        setAssignments(data || []);
      }
      setIsLoading(false);
    }

    fetchAssignments();
  }, [classId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Assigned Tests
            </CardTitle>
            <CardDescription>Tests assigned to this class.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/teacher/tests">
              <Plus className="h-4 w-4 mr-2" />
              Assign Test
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map(assignment => (
              <div key={assignment.id} className="p-4 rounded-lg border hover:border-primary transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                    {assignment.tests && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.tests.total_questions} questions • {assignment.tests.total_marks} marks
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                      {assignment.due_at && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>Due {formatDistanceToNow(new Date(assignment.due_at), { addSuffix: true })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge variant="secondary">Assigned</Badge>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No tests assigned yet.</p>
              <Button variant="outline" size="sm" className="mt-4" asChild>
                <Link href="/teacher/tests">Assign a Test</Link>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClassMessages({ classId }: { classId: string }) {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<{ studentId: string; studentName: string } | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user, classId]);

  async function fetchMessages() {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('class_messages')
      .select('*, sender:users!class_messages_sender_id_fkey(display_name)')
      .eq('class_id', classId)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  }

  async function handleReply() {
    if (!user || !replyTo || !replyMessage.trim()) return;
    setIsSending(true);

    const { error } = await supabase
      .from('class_messages')
      .insert({
        class_id: classId,
        sender_id: user.id,
        recipient_id: replyTo.studentId,
        message: replyMessage.trim(),
        is_read: false
      });

    if (error) {
      console.error('Error sending reply:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not send reply.' });
    } else {
      toast({ title: 'Reply Sent', description: `Your reply has been sent to ${replyTo.studentName}.` });
      setReplyMessage('');
      setReplyTo(null);
      fetchMessages();
    }
    setIsSending(false);
  }

  async function markAsRead(messageId: string) {
    await supabase
      .from('class_messages')
      .update({ is_read: true })
      .eq('id', messageId);
    
    setMessages(messages.map(m => m.id === messageId ? { ...m, is_read: true } : m));
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const unreadCount = messages.filter(m => !m.is_read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Student Messages
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} new</Badge>
          )}
        </CardTitle>
        <CardDescription>Messages from students in this class.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {messages.length > 0 ? (
            messages.map(msg => (
              <div 
                key={msg.id} 
                className={`p-4 rounded-lg border ${!msg.is_read ? 'bg-primary/5 border-primary/30' : 'bg-muted/50'}`}
                onClick={() => !msg.is_read && markAsRead(msg.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback>{msg.sender?.display_name?.charAt(0) || 'S'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">{msg.sender?.display_name || 'Student'}</span>
                      {!msg.is_read && <Badge variant="secondary" className="text-xs">New</Badge>}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReplyTo({ studentId: msg.sender_id, studentName: msg.sender?.display_name || 'Student' });
                    }}
                  >
                    Reply
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No messages from students yet.</p>
            </div>
          )}
        </div>

        {/* Reply Dialog */}
        {replyTo && (
          <div className="mt-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Reply to {replyTo.studentName}</span>
              <Button variant="ghost" size="icon" onClick={() => setReplyTo(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Textarea
              placeholder="Type your reply..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              rows={3}
            />
            <Button 
              onClick={handleReply} 
              disabled={isSending || !replyMessage.trim()}
              className="mt-2"
            >
              {isSending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Send Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClassSettings({ 
  classData, 
  onUpdate, 
  onDelete 
}: { 
  classData: ClassData;
  onUpdate: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [className, setClassName] = useState(classData.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleSave = async () => {
    if (!className || className === classData.name) return;
    setIsSaving(true);
    await onUpdate(className);
    setIsSaving(false);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete();
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update the basic information for your class.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="className">Class Name</Label>
              <Input 
                id="className" 
                value={className} 
                onChange={(e) => setClassName(e.target.value)} 
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={isSaving || className === classData.name}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-between items-center">
          <div>
            <p className="font-semibold text-foreground">Delete this class</p>
            <p className="text-sm text-muted-foreground">This will permanently delete the class.</p>
          </div>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4"/>
            Delete Class
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the class <span className="font-bold text-foreground">{classData.name}</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const { toast } = useToast();
  const { user } = useUser();
  const supabase = createClient();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!classId) return;
    fetchClassData();
    fetchEnrollments();
    fetchInvitations();
  }, [classId]);

  async function fetchClassData() {
    const { data, error } = await supabase
      .from('classes')
      .select('*, subjects(name)')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('Error fetching class:', error);
      setIsLoading(false);
      return;
    }

    setClassData(data);
    setIsLoading(false);
  }

  async function fetchEnrollments() {
    const { data, error } = await supabase
      .from('enrollments')
      .select('*, users(id, email, display_name, avatar_url, xp)')
      .eq('class_id', classId);

    if (error) {
      console.error('Error fetching enrollments:', error);
      return;
    }

    setEnrollments(data || []);
  }

  async function fetchInvitations() {
    const { data, error } = await supabase
      .from('class_invitations')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
      return;
    }

    setInvitations(data || []);
  }

  const activeEnrollments = enrollments.filter(e => e.status === 'active');
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');

  const handleRemoveStudent = async (enrollmentId: string) => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not remove student.' });
      return;
    }

    toast({ title: 'Student Removed', description: 'The student has been removed from the class.' });
    fetchEnrollments();
  };

  const handleApproveStudent = async (enrollmentId: string, studentName: string) => {
    const { error } = await supabase
      .from('enrollments')
      .update({ status: 'active' })
      .eq('id', enrollmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve student.' });
      return;
    }

    toast({ title: 'Student Approved', description: `${studentName} has been added to the class.` });
    fetchEnrollments();
  };

  const handleDeclineStudent = async (enrollmentId: string, studentName: string) => {
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('id', enrollmentId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not decline request.' });
      return;
    }

    toast({ title: 'Request Declined', description: `${studentName}'s request has been declined.` });
    fetchEnrollments();
  };

  const handleUpdateClass = async (name: string) => {
    const { error } = await supabase
      .from('classes')
      .update({ name })
      .eq('id', classId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not update class.' });
      return;
    }

    toast({ title: 'Class Updated', description: 'The class name has been updated.' });
    fetchClassData();
  };

  const handleDeleteClass = async () => {
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', classId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete class.' });
      return;
    }

    toast({ title: 'Class Deleted', description: 'The class has been permanently deleted.' });
    router.push('/teacher/classes');
  };

  const handleCopyCode = () => {
    if (!classData?.join_code) return;
    navigator.clipboard.writeText(classData.join_code);
    toast({ title: 'Copied!', description: `Class code ${classData.join_code} copied to clipboard.` });
  };

  const handleCancelInvite = async (invitationId: string) => {
    const { error } = await supabase
      .from('class_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not cancel invitation.' });
      return;
    }

    toast({ title: 'Invitation Cancelled', description: 'The invitation has been cancelled.' });
    fetchInvitations();
  };

  const handleMessageStudent = (studentId: string, studentName: string) => {
    // Open message dialog to send a direct message to this student
    setMessageRecipient({ id: studentId, name: studentName });
    setMessageDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div>
        <Skeleton className="h-9 w-48 mb-4" />
        <div className="mb-8">
          <Skeleton className="h-9 w-1/2 mb-2" />
          <Skeleton className="h-5 w-1/4" />
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div>
        <Button variant="ghost" onClick={() => router.push('/teacher/classes')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to My Classes
        </Button>
        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border border-dashed">
          <h3 className="text-xl font-semibold text-foreground">Class Not Found</h3>
          <p className="text-muted-foreground mt-2">The class you are looking for does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/teacher/classes')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Classes
      </Button>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">{classData.name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-muted-foreground">Class Code:</p>
          <button 
            onClick={handleCopyCode} 
            className="font-mono text-sm bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors flex items-center gap-2"
          >
            {classData.join_code}
            <Copy className="h-3 w-3" />
          </button>
        </div>
      </div>

      <Tabs defaultValue="people" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full">
          <TabsTrigger value="people" className="flex-1 min-w-[100px]"><Users className="mr-1.5 h-4 w-4 hidden sm:inline"/>People</TabsTrigger>
          <TabsTrigger value="announcements" className="flex-1 min-w-[100px]"><MessageSquare className="mr-1.5 h-4 w-4 hidden sm:inline"/>Announcements</TabsTrigger>
          <TabsTrigger value="tests" className="flex-1 min-w-[100px]"><ClipboardList className="mr-1.5 h-4 w-4 hidden sm:inline"/>Tests</TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 min-w-[100px]"><Mail className="mr-1.5 h-4 w-4 hidden sm:inline"/>Messages</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1 min-w-[100px]"><BarChart className="mr-1.5 h-4 w-4 hidden sm:inline"/>Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 min-w-[100px]"><Settings className="mr-1.5 h-4 w-4 hidden sm:inline"/>Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="people" className="mt-6">
          <PeopleTab 
            classId={classId}
            className={classData.name}
            joinCode={classData.join_code}
            teacherId={user?.id || ''}
          />
        </TabsContent>
        
        <TabsContent value="announcements" className="mt-6">
          <AnnouncementsTab 
            classId={classId}
            teacherId={user?.id || ''}
          />
        </TabsContent>
        
        <TabsContent value="tests" className="mt-6">
          <ClassAssignments classId={classId} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <ThreadedMessages classId={classId} />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Class Analytics</CardTitle>
              <CardDescription>View performance metrics for your class.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{activeEnrollments.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{pendingEnrollments.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">--</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="settings" className="mt-6">
          <ClassSettings 
            classData={classData} 
            onUpdate={handleUpdateClass} 
            onDelete={handleDeleteClass} 
          />
        </TabsContent>
      </Tabs>

      {/* Message Dialog */}
      <AlertDialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Message to {messageRecipient?.name}</AlertDialogTitle>
            <AlertDialogDescription>
              Send a private message to this student. They will receive it in their class messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              id="message-content"
              placeholder="Type your message here..."
              rows={4}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!user || !messageRecipient) return;
                const messageContent = (document.getElementById('message-content') as HTMLTextAreaElement)?.value;
                if (!messageContent?.trim()) {
                  toast({ variant: 'destructive', title: 'Error', description: 'Please enter a message.' });
                  return;
                }

                const { error } = await supabase
                  .from('class_messages')
                  .insert({
                    class_id: classId,
                    sender_id: user.id,
                    recipient_id: messageRecipient.id,
                    message: messageContent.trim(),
                    is_read: false
                  });

                if (error) {
                  toast({ variant: 'destructive', title: 'Error', description: 'Could not send message.' });
                } else {
                  toast({ title: 'Message Sent', description: `Your message has been sent to ${messageRecipient.name}.` });
                  setMessageDialogOpen(false);
                  setMessageRecipient(null);
                }
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
