'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Plus, 
  Pin, 
  Trash2, 
  Edit, 
  Send,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Announcement {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  message: string;
  attachments: any[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  users?: {
    display_name: string;
    avatar_url?: string;
  };
}

interface AnnouncementsTabProps {
  classId: string;
  teacherId: string;
}

export function AnnouncementsTab({ classId, teacherId }: AnnouncementsTabProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { toast } = useToast();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  async function fetchAnnouncements() {
    try {
      const { data, error } = await supabase
        .from('class_announcements')
        .select('*, users(display_name, avatar_url)')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching announcements:', error);
      } else {
        setAnnouncements(data || []);
      }
    } catch (err) {
      console.error('Exception fetching announcements:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateAnnouncement() {
    if (!title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('class_announcements')
        .insert({
          class_id: classId,
          teacher_id: teacherId,
          title: title.trim(),
          message: message.trim(),
          is_pinned: isPinned,
          attachments: []
        });

      if (error) {
        console.error('Error creating announcement:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not create announcement.' });
      } else {
        toast({ title: 'Success', description: 'Announcement created successfully.' });
        setTitle('');
        setMessage('');
        setIsPinned(false);
        setShowCreateDialog(false);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Exception creating announcement:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdateAnnouncement() {
    if (!editingAnnouncement || !title.trim() || !message.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please fill in all fields.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('class_announcements')
        .update({
          title: title.trim(),
          message: message.trim(),
          is_pinned: isPinned
        })
        .eq('id', editingAnnouncement.id);

      if (error) {
        console.error('Error updating announcement:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update announcement.' });
      } else {
        toast({ title: 'Success', description: 'Announcement updated successfully.' });
        setTitle('');
        setMessage('');
        setIsPinned(false);
        setEditingAnnouncement(null);
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Exception updating announcement:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAnnouncement(id: string) {
    try {
      const { error } = await supabase
        .from('class_announcements')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting announcement:', error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not delete announcement.' });
      } else {
        toast({ title: 'Success', description: 'Announcement deleted successfully.' });
        fetchAnnouncements();
      }
    } catch (err) {
      console.error('Exception deleting announcement:', err);
      toast({ variant: 'destructive', title: 'Error', description: 'An unexpected error occurred.' });
    }
  }

  function startEdit(announcement: Announcement) {
    setEditingAnnouncement(announcement);
    setTitle(announcement.title);
    setMessage(announcement.message);
    setIsPinned(announcement.is_pinned);
  }

  function cancelEdit() {
    setEditingAnnouncement(null);
    setTitle('');
    setMessage('');
    setIsPinned(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Class Announcements</h3>
          <p className="text-sm text-muted-foreground">Share updates and important information with your students</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share an announcement with your class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter announcement title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your announcement message..."
                  className="mt-1 min-h-[100px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="pin"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="pin" className="text-sm">
                  Pin this announcement (will appear at the top)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateAnnouncement} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post Announcement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAnnouncement} onOpenChange={(open) => !open && cancelEdit()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Announcement</DialogTitle>
            <DialogDescription>
              Update your announcement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement message..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-pin"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded"
              />
              <label htmlFor="edit-pin" className="text-sm">
                Pin this announcement
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleUpdateAnnouncement} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Update Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No announcements yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first announcement to share updates with your students
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={announcement.is_pinned ? 'border-primary' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={announcement.users?.avatar_url ?? undefined} />
                      <AvatarFallback>
                        {announcement.users?.display_name?.charAt(0) || 'T'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        {announcement.is_pinned && (
                          <Badge variant="secondary" className="text-xs">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {announcement.users?.display_name || 'Teacher'} • 
                        {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this announcement? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAnnouncement(announcement.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {announcement.message}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
