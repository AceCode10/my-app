'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, Trash2, Clock, ClipboardList, MessageSquare, UserPlus, FileCheck, Mail, Trophy, Flame, Megaphone, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/use-notifications';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '@/types/notifications';

const iconMap: Record<NotificationType, React.ElementType> = {
  assignment_created: ClipboardList,
  assignment_due_soon: Clock,
  assignment_graded: CheckCircle,
  announcement_posted: Megaphone,
  message_received: MessageSquare,
  student_joined_class: UserPlus,
  student_submitted_assignment: FileCheck,
  class_invitation: Mail,
  achievement_unlocked: Trophy,
  streak_milestone: Flame,
  system: Bell,
};

const colorMap: Record<NotificationType, string> = {
  assignment_created: 'text-blue-500 bg-blue-500/10',
  assignment_due_soon: 'text-amber-500 bg-amber-500/10',
  assignment_graded: 'text-green-500 bg-green-500/10',
  announcement_posted: 'text-purple-500 bg-purple-500/10',
  message_received: 'text-indigo-500 bg-indigo-500/10',
  student_joined_class: 'text-emerald-500 bg-emerald-500/10',
  student_submitted_assignment: 'text-cyan-500 bg-cyan-500/10',
  class_invitation: 'text-pink-500 bg-pink-500/10',
  achievement_unlocked: 'text-yellow-500 bg-yellow-500/10',
  streak_milestone: 'text-orange-500 bg-orange-500/10',
  system: 'text-muted-foreground bg-muted',
};

function groupNotificationsByDate(notifications: Notification[]) {
  const groups: { label: string; notifications: Notification[] }[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifications.forEach(notification => {
    const date = new Date(notification.created_at);
    if (isToday(date)) {
      today.push(notification);
    } else if (isYesterday(date)) {
      yesterday.push(notification);
    } else {
      const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 7) {
        thisWeek.push(notification);
      } else {
        older.push(notification);
      }
    }
  });

  if (today.length > 0) groups.push({ label: 'Today', notifications: today });
  if (yesterday.length > 0) groups.push({ label: 'Yesterday', notifications: yesterday });
  if (thisWeek.length > 0) groups.push({ label: 'This Week', notifications: thisWeek });
  if (older.length > 0) groups.push({ label: 'Older', notifications: older });

  return groups;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({ notification, onMarkAsRead, onDelete, onClick }: NotificationItemProps) {
  const Icon = iconMap[notification.type] || Bell;
  const colorClass = colorMap[notification.type] || colorMap.system;

  return (
    <div
      className={cn(
        'group relative flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer',
        notification.is_read 
          ? 'hover:bg-muted/50' 
          : 'bg-primary/5 hover:bg-primary/10 border-l-2 border-primary'
      )}
      onClick={() => onClick(notification)}
    >
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center', colorClass)}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            'text-sm',
            notification.is_read ? 'text-muted-foreground' : 'font-semibold text-foreground'
          )}>
            {notification.title}
          </p>
          {!notification.is_read && (
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {notification.message}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!notification.is_read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onMarkAsRead(notification.id);
            }}
            title="Mark as read"
          >
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const groupedNotifications = groupNotificationsByDate(notifications);

  return (
    <div className="container max-w-3xl py-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllNotifications}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </CardContent>
        </Card>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No notifications</h3>
            <p className="text-muted-foreground mt-1 max-w-sm">
              You're all caught up! We'll notify you when there's something new.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedNotifications.map((group) => (
            <div key={group.label}>
              <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
                {group.label}
              </h2>
              <Card>
                <CardContent className="p-2 space-y-1">
                  {group.notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onDelete={deleteNotification}
                      onClick={handleNotificationClick}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
