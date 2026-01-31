/**
 * Custom hook for gamification features
 * Provides easy access to XP, streaks, badges, and notifications
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { XPService, type UserGamification } from '@/lib/gamification/xp-service';
import { StreakService, type StreakData } from '@/lib/gamification/streak-service';
import { BadgeService, type UserBadge } from '@/lib/gamification/badge-service';
import { NotificationService, type Notification } from '@/lib/notifications/notification-service';
import { useUser } from './use-user';

export function useGamification() {
  const { user } = useUser();
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Use refs to track mounted state and prevent memory leaks
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize services to prevent recreation on every render
  const xpService = useMemo(() => new XPService(), []);
  const streakService = useMemo(() => new StreakService(), []);
  const badgeService = useMemo(() => new BadgeService(), []);
  const notificationService = useMemo(() => new NotificationService(), []);

  // Load all gamification data with retry logic
  const loadData = useCallback(async (retryCount = 0) => {
    if (!user || !mountedRef.current) return;

    try {
      const [gamData, streakInfo, badgeList, notifList, unread] = await Promise.all([
        xpService.getUserGamification(user.id),
        streakService.getStreakData(user.id),
        badgeService.getUserBadges(user.id),
        notificationService.getUserNotifications(user.id, false, 10),
        notificationService.getUnreadCount(user.id)
      ]);

      // Check if still mounted before updating state
      if (!mountedRef.current) return;

      // If gamification data is null and we haven't retried too many times, retry
      if (!gamData && retryCount < 2) {
        console.log('Gamification data not found, retrying...');
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            loadData(retryCount + 1);
          }
        }, 1000);
        return;
      }

      setGamification(gamData);
      setStreakData(streakInfo || { current_streak: 0, longest_streak: 0, streak_freeze_count: 0 });
      setBadges(badgeList);
      setNotifications(notifList);
      setUnreadCount(unread);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error loading gamification data:', errorMessage);
      // Retry on error
      if (retryCount < 2 && mountedRef.current) {
        retryTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            loadData(retryCount + 1);
          }
        }, 1000);
        return;
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, xpService, streakService, badgeService, notificationService]);

  // Initial data load
  useEffect(() => {
    mountedRef.current = true;
    loadData();
    
    return () => {
      // Clear any pending retry timeouts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, [loadData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;
    
    let isSubscribed = true;

    // Event handlers with mounted check
    const handleXPEarned = () => {
      if (isSubscribed && mountedRef.current) loadData();
    };
    const handleStreakUpdate = () => {
      if (isSubscribed && mountedRef.current) loadData();
    };
    const handleBadgeEarned = () => {
      if (isSubscribed && mountedRef.current) loadData();
    };

    // Add event listeners
    window.addEventListener('xp_earned', handleXPEarned);
    window.addEventListener('streak_updated', handleStreakUpdate);
    window.addEventListener('badge_earned', handleBadgeEarned);

    // Notification subscription
    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      (notification) => {
        if (isSubscribed && mountedRef.current) {
          setNotifications(prev => [notification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
        }
      }
    );

    return () => {
      isSubscribed = false;
      window.removeEventListener('xp_earned', handleXPEarned);
      window.removeEventListener('streak_updated', handleStreakUpdate);
      window.removeEventListener('badge_earned', handleBadgeEarned);
      unsubscribe();
    };
  }, [user, loadData, notificationService]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
    };
  }, []);

  // Helper functions
  const getLevelProgress = useCallback(() => {
    if (!gamification) return 0;
    return xpService.getLevelProgress(gamification);
  }, [gamification]);

  const getXPToNextLevel = useCallback(() => {
    if (!gamification) return 100;
    return xpService.getXPToNextLevel(gamification);
  }, [gamification]);

  const getLevelTitle = useCallback(() => {
    if (!gamification) return 'Beginner';
    return xpService.getLevelTitle(gamification.xp_level);
  }, [gamification]);

  const getStreakRisk = useCallback(async () => {
    if (!user) return 'lost';
    return await streakService.getStreakRisk(user.id);
  }, [user]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  }, []);

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!user) return false;
    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
    return success;
  }, [user]);

  return {
    // Data
    gamification,
    streakData,
    badges,
    notifications,
    unreadCount,
    loading,

    // Helper functions
    getLevelProgress,
    getXPToNextLevel,
    getLevelTitle,
    getStreakRisk,
    markNotificationAsRead,
    markAllNotificationsAsRead,

    // Refresh function
    refresh: loadData
  };
}
