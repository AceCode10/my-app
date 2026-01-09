'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Pin, 
  ExternalLink,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';

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

interface AnnouncementFeedProps {
  classId: string;
}

export function AnnouncementFeed({ classId }: AnnouncementFeedProps) {
  const { user } = useUser();
  const supabase = createClient();
  const { toast } = useToast();
  
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, [classId]);

  async function fetchAnnouncements() {
    try {
      // First try with user info, if that fails try without
      let { data, error } = await supabase
        .from('class_announcements')
        .select('*, users(display_name, avatar_url)')
        .eq('class_id', classId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

      // If the join fails, try without user info
      if (error && error.message?.includes('users')) {
        console.log('Trying without user join...');
        const result = await supabase
          .from('class_announcements')
          .select('*')
          .eq('class_id', classId)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching announcements:', error);
        toast({ 
          variant: 'destructive', 
          title: 'Error', 
          description: 'Could not load announcements. Please check your class enrollment.' 
        });
      } else {
        setAnnouncements(data || []);
      }
    } catch (err) {
      console.error('Exception fetching announcements:', err);
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'An unexpected error occurred.' 
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No announcements</h3>
          <p className="text-muted-foreground text-center">
            Your teacher hasn't posted any announcements yet
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => (
        <Card key={announcement.id} className={announcement.is_pinned ? 'border-primary' : ''}>
          <CardHeader className="pb-3">
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
          </CardHeader>
          <CardContent className="pt-0">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {announcement.message}
            </div>
            
            {/* Attachments would go here if implemented */}
            {announcement.attachments && announcement.attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Attachments</p>
                {announcement.attachments.map((attachment, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="h-auto p-2 justify-start"
                    asChild
                  >
                    <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {attachment.name || `Attachment ${index + 1}`}
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
