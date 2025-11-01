'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { useUser } from '@/hooks/use-user';

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
  const { user } = useUser();

  // Simple notification count for now
  const notificationCount = 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-background border rounded-lg shadow-lg z-50">
          <div className="p-4">
            <h3 className="font-semibold mb-2">Notifications</h3>
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="mx-auto h-8 w-8 mb-2" />
              <p>No notifications yet</p>
              <p className="text-sm">Notifications will appear here when available</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
