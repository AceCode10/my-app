'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, MessageSquare, Users, ClipboardList, Clock, CheckCircle, AlertCircle, Send, Loader2, Mail, Bell, ChevronRight, MoreVertical, Pin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AnnouncementFeed } from '@/components/student/announcement-feed';

interface ClassData {
  id: string;
  name: string;
  subject_id: string;
  teacher_id: string;
  join_code: string;
  subjects?: { name: string };
  users?: { display_name: string; email: string; avatar_url?: string };
}

interface Assignment {
  id: string;
  title: string;
  instructions: string;
  due_at: string;
  start_at: string;
  time_limit_minutes: number;
  test_id: string;
  paper_id: string;
  show_results: string;
  created_at: string;
}

interface Announcement {
  id: string;
  class_id: string;
  author_id: string;
  author_name: string;
  message: string;
  note_id?: string;
  note_title?: string;
  note_path?: string;
  created_at: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  class_id: string;
  status: string;
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

function AssignmentsList({ classId }: { classId: string }) {
  const supabase = createClient();
  const { user } = useUser();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAssignments() {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('target_class_id', classId)
        .order('due_at', { ascending: true });

      if (error) {
        console.error('Error fetching assignments:', error);
      } else {
        setAssignments(data || []);
      }

      // Fetch user's attempts for these assignments
      if (user && data) {
        const assignmentIds = data.map(a => a.id);
        const { data: attemptsData } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('user_id', user.id)
          .in('assignment_id', assignmentIds);
        setAttempts(attemptsData || []);
      }

      setIsLoading(false);
    }

    fetchAssignments();
  }, [classId, user]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const getAssignmentStatus = (assignment: Assignment) => {
    const attempt = attempts.find(a => a.assignment_id === assignment.id);
    if (attempt) {
      if (attempt.status === 'submitted' || attempt.status === 'graded') {
        return { status: 'completed', label: 'Completed', variant: 'default' as const };
      }
      return { status: 'in_progress', label: 'In Progress', variant: 'secondary' as const };
    }
    
    const now = new Date();
    const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
    const hasValidDueDate = dueDate && dueDate.getFullYear() > 1980;
    
    if (hasValidDueDate && dueDate < now) {
      return { status: 'overdue', label: 'Overdue', variant: 'destructive' as const };
    }
    return { status: 'pending', label: 'Not Started', variant: 'outline' as const };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Assignments
        </CardTitle>
        <CardDescription>View and complete your class assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {assignments.length > 0 ? (
            assignments.map(assignment => {
              const statusInfo = getAssignmentStatus(assignment);
              const dueDate = assignment.due_at ? new Date(assignment.due_at) : null;
              const hasValidDueDate = dueDate && dueDate.getFullYear() > 1980;
              const isOverdue = hasValidDueDate && dueDate < new Date() && statusInfo.status !== 'completed';

              return (
                <Link
                  key={assignment.id}
                  href={`/student/assessments/${assignment.id}`}
                  className="block"
                >
                  <div className="p-4 rounded-lg border hover:border-primary transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </div>
                        {assignment.instructions && (
                          <p className="text-sm text-muted-foreground mb-2">{assignment.instructions}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {hasValidDueDate ? (
                              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                Due {formatDistanceToNow(dueDate, { addSuffix: true })}
                              </span>
                            ) : (
                              <span>No due date</span>
                            )}
                          </div>
                          {assignment.time_limit_minutes && (
                            <div className="flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>{assignment.time_limit_minutes} min limit</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {statusInfo.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="text-center py-10 border-2 border-dashed rounded-lg">
              <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="text-muted-foreground mt-2">No assignments yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ClassAnnouncement {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  message: string;
  attachments: any[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

function GoogleStyleAnnouncementFeed({ classId }: { classId: string }) {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<ClassAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnnouncements() {
      const { data, error } = await supabase
        .from('class_announcements')
        .select('*')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
      } else {
        setAnnouncements(data || []);
      }
      setIsLoading(false);
    }

    fetchAnnouncements();
  }, [classId]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border-2 border-dashed border-primary/20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No announcements yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Your teacher hasn't posted any announcements. Check back later for updates!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((announcement) => {
        const isExpanded = expandedId === announcement.id;
        
        return (
          <div
            key={announcement.id}
            className={`group relative bg-card rounded-xl border shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/30 ${
              announcement.is_pinned ? 'border-l-4 border-l-amber-500' : ''
            }`}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
              className="w-full text-left p-4"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  announcement.is_pinned 
                    ? 'bg-amber-500 text-white' 
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {announcement.is_pinned ? (
                    <Pin className="h-5 w-5" />
                  ) : (
                    <MessageSquare className="h-5 w-5" />
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground truncate">
                      {announcement.title || 'Announcement'}
                    </h4>
                    {announcement.is_pinned && (
                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Pinned
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                {/* Expand indicator */}
                <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? 'rotate-90' : ''
                }`} />
              </div>
            </button>
            
            {/* Expanded content */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-0">
                <div className="ml-14 pt-3 border-t">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {announcement.message}
                  </p>
                  
                  {/* Attachments */}
                  {announcement.attachments && announcement.attachments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {announcement.attachments.map((attachment: any, index: number) => (
                          <a
                            key={index}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                          >
                            <BookOpen className="h-4 w-4" />
                            {attachment.name || `Attachment ${index + 1}`}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PeopleView({ classId, teacherId, teacherData }: { classId: string; teacherId: string; teacherData?: { display_name: string; email: string; avatar_url?: string } }) {
  const supabase = createClient();
  const { user } = useUser();
  const [classmates, setClassmates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClassmates() {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, users(id, display_name, email, avatar_url)')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('enrolled_at', { ascending: false });

      if (!error && data) {
        setClassmates(data);
      }
      setIsLoading(false);
    }

    fetchClassmates();
  }, [classId]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Teacher Section */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher</CardTitle>
          <CardDescription>Your class instructor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <Avatar className="h-12 w-12">
              <AvatarImage src={teacherData?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {teacherData?.display_name?.charAt(0) || 'T'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{teacherData?.display_name || 'Unknown Teacher'}</p>
              <p className="text-sm text-muted-foreground">{teacherData?.email || 'No email available'}</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <a href="#messages" onClick={() => {
                const messagesTab = document.querySelector('[value="messages"]') as HTMLButtonElement;
                if (messagesTab) messagesTab.click();
              }}>
                <Mail className="h-4 w-4 mr-2" />
                Message
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Classmates Section */}
      <Card>
        <CardHeader>
          <CardTitle>Classmates</CardTitle>
          <CardDescription>{classmates.length} student{classmates.length !== 1 ? 's' : ''} enrolled</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {classmates.length > 0 ? (
              classmates.map((classmate) => {
                const student = classmate.users;
                if (!student) return null;
                const isCurrentUser = student.id === user?.id;

                return (
                  <div 
                    key={classmate.id} 
                    className={`flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors ${
                      isCurrentUser ? 'bg-primary/5 border border-primary/20' : ''
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={student.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {student.display_name?.charAt(0) || 'S'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {student.display_name}
                        {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                      </p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No other students enrolled yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MessageTeacher({ classId, teacherId, teacherName }: { classId: string; teacherId: string; teacherName: string }) {
  const supabase = createClient();
  const { user } = useUser();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
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
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  }

  async function handleSendMessage() {
    if (!user || !newMessage.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a message.' });
      return;
    }
    setIsSending(true);

    try {
      const { error } = await supabase
        .from('class_messages')
        .insert({
          class_id: classId,
          sender_id: user.id,
          recipient_id: teacherId,
          message: newMessage.trim(),
          is_read: false
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({ variant: 'destructive', title: 'Error', description: `Could not send message: ${error.message}` });
      } else {
        toast({ title: 'Message Sent', description: 'Your message has been sent to the teacher.' });
        setNewMessage('');
        await fetchMessages();
      }
    } catch (err) {
      console.error('Exception sending message:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
    setIsSending(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Message Teacher
        </CardTitle>
        <CardDescription>Send a private message to {teacherName}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Message History */}
        <div className="max-h-64 overflow-y-auto space-y-3 p-3 bg-muted/30 rounded-lg border">
          {messages.length > 0 ? (
            messages.map(msg => (
              <div 
                key={msg.id} 
                className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] p-3 rounded-lg ${
                    msg.sender_id === user?.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  <p className={`text-xs mt-1 ${msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No messages yet. Start a conversation with your teacher.
            </div>
          )}
        </div>

        {/* New Message Input */}
        <div className="space-y-2">
          <Textarea
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            rows={3}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isSending || !newMessage.trim()}
            className="w-full"
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send Message
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;
  const { user } = useUser();
  const supabase = createClient();

  const [classData, setClassData] = useState<ClassData | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;

    async function fetchClassData() {
      const { data, error } = await supabase
        .from('classes')
        .select('*, subjects(name), users!classes_teacher_id_fkey(display_name, email, avatar_url)')
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

    async function fetchStudentCount() {
      const { count, error } = await supabase
        .from('enrollments')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('status', 'active');

      if (!error && count !== null) {
        setStudentCount(count);
      }
    }

    async function fetchAnnouncementCount() {
      const { count, error } = await supabase
        .from('class_announcements')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId);

      if (!error && count !== null) {
        setAnnouncementCount(count);
      }
    }

    async function fetchUnreadMessages() {
      if (!user) return;
      const { count, error } = await supabase
        .from('class_messages')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      if (!error && count !== null) {
        setUnreadMessageCount(count);
      }
    }

    fetchClassData();
    fetchStudentCount();
    fetchAnnouncementCount();
    fetchUnreadMessages();
  }, [classId, user]);

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
        <Button variant="ghost" onClick={() => router.push('/student')} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="text-center py-20 bg-background rounded-2xl shadow-sm border border-dashed">
          <h3 className="text-xl font-semibold text-foreground">Class Not Found</h3>
          <p className="text-muted-foreground mt-2">You are not enrolled in this class or it does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="ghost" onClick={() => router.push('/student/classes')} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Classes
      </Button>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-foreground">{classData.name}</h2>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
          <span>{classData.subjects?.name || 'Unknown Subject'}</span>
          {classData.users && (
            <>
              <span>•</span>
              <span>Teacher: {classData.users.display_name}</span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="assignments" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 w-full bg-muted/50 rounded-xl">
          <TabsTrigger 
            value="assignments" 
            className="flex-1 min-w-[70px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <ClipboardList className="mr-1.5 h-4 w-4 hidden sm:inline" />
            <span className="hidden sm:inline">Assignments</span>
            <span className="sm:hidden">Work</span>
          </TabsTrigger>
          <TabsTrigger 
            value="announcements"
            className="flex-1 min-w-[70px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all relative"
          >
            <Bell className="mr-1.5 h-4 w-4 hidden sm:inline" />
            <span className="hidden sm:inline">Announcements</span>
            <span className="sm:hidden">News</span>
            {announcementCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                {announcementCount > 9 ? '9+' : announcementCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="people"
            className="flex-1 min-w-[70px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
          >
            <Users className="mr-1.5 h-4 w-4 hidden sm:inline" />
            <span className="hidden sm:inline">People</span>
            <span className="sm:hidden">Class</span>
          </TabsTrigger>
          <TabsTrigger 
            value="messages"
            className="flex-1 min-w-[70px] rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all relative"
          >
            <Mail className="mr-1.5 h-4 w-4 hidden sm:inline" />
            <span className="hidden sm:inline">Messages</span>
            <span className="sm:hidden">Chat</span>
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium animate-pulse">
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="mt-6">
          <AssignmentsList classId={classId} />
        </TabsContent>

        <TabsContent value="announcements" className="mt-6">
          <GoogleStyleAnnouncementFeed classId={classId} />
        </TabsContent>

        <TabsContent value="people" className="mt-6">
          <PeopleView classId={classId} teacherId={classData.teacher_id} teacherData={classData.users} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          {classData.teacher_id && classData.users && (
            <MessageTeacher 
              classId={classId} 
              teacherId={classData.teacher_id} 
              teacherName={classData.users.display_name || 'Teacher'} 
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
