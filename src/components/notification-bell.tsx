
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useClasses } from '@/hooks/use-classes';


// Define the notification type
export type Notification = {
  id: number;
  type: 'streak' | 'submission' | 'badge' | 'request' | 'approval'; 
  message: string;
  timestamp: string;
  read: boolean;
  classId?: string;
  studentId?: string;
};

type NotificationBellProps = {
  initialNotifications?: Notification[];
};

export function NotificationBell({ initialNotifications = [] }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, roles } = useUser();
  const { classes } = useClasses();

  const dynamicNotifications = useMemo((): Notification[] => {
    if (!roles.includes('teacher') || !classes) return [];
    let notifs: Notification[] = [];
    classes.forEach(c => {
        if (c.pendingStudentIds && c.pendingStudentIds.length > 0) {
            c.pendingStudentIds.forEach((studentId, index) => {
                notifs.push({
                    id: Date.now() + index, // Simple unique ID
                    type: 'request',
                    message: `A student wants to join ${c.name}.`,
                    timestamp: 'now', // This should be dynamic in a real app
                    read: false,
                    classId: c.id,
                    studentId,
                });
            });
        }
    });
    return notifs;
  }, [classes, roles]);

  useEffect(() => {
    const allNotifs = [...initialNotifications, ...dynamicNotifications];
    setNotifications(allNotifs);
  }, [initialNotifications, dynamicNotifications]);


  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = (id: number) => {
    setNotifications(
      notifications.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  }

  const handleRequest = async (notification: Notification, approved: boolean) => {
    if (!firestore || !notification.classId || !notification.studentId || !user) return;

    const classRef = doc(firestore, 'classes', notification.classId);
    
    try {
        if (approved) {
            await updateDoc(classRef, {
                studentIds: arrayUnion(notification.studentId),
                pendingStudentIds: arrayRemove(notification.studentId)
            });
            toast({
                title: `Request Approved`,
                description: `Student has been added to the class.`,
            });
        } else { // Decline
            await updateDoc(classRef, {
                pendingStudentIds: arrayRemove(notification.studentId)
            });
            toast({
                title: `Request Declined`,
            });
        }
        // Remove the notification from the local state to update the UI instantly
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
    } catch (error) {
         toast({
            variant: 'destructive',
            title: `Action Failed`,
            description: `Could not process the request. Please try again.`,
        });
    }
  }
  
  const getIcon = (type: Notification['type']) => {
    switch(type) {
      case 'request': return <UserPlus className="h-5 w-5 text-blue-500"/>;
      case 'approval': return <CheckCircle className="h-5 w-5 text-green-500"/>;
      default: return <Bell className="h-5 w-5 text-slate-500"/>;
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full text-muted-foreground hover:bg-muted"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-background rounded-lg shadow-lg border z-10">
          <div className="p-4 flex justify-between items-center border-b">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && <button onClick={handleMarkAllAsRead} className="text-sm text-primary hover:underline">Mark all as read</button>}
          </div>
          <ul className="divide-y max-h-96 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <li key={notification.id} className={`p-4 hover:bg-muted/50 ${!notification.read ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start space-x-3">
                    <div className={`mt-1 flex-shrink-0 h-2 w-2 rounded-full ${!notification.read ? 'bg-primary' : 'bg-transparent'}`}></div>
                    <div className="flex-shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.timestamp}</p>
                       {notification.type === 'request' && (
                         <div className="flex space-x-2 mt-2">
                           <Button size="sm" variant="default" onClick={() => handleRequest(notification, true)}>Approve</Button>
                           <Button size="sm" variant="outline" onClick={() => handleRequest(notification, false)}>Decline</Button>
                         </div>
                       )}
                    </div>
                    {!notification.read && (
                      <button onClick={() => handleMarkAsRead(notification.id)} className="p-1 text-muted-foreground hover:text-foreground" title="Mark as read">
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))
            ) : (
                <li className="p-4 text-center text-sm text-muted-foreground">
                    You have no new notifications.
                </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
