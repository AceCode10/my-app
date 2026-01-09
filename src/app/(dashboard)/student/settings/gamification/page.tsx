'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUser } from '@/hooks/use-user';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Bell, Mail, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  quiz_completed: boolean;
  streak_milestone: boolean;
  badge_earned: boolean;
  assignment_due: boolean;
  class_announcement: boolean;
}

export default function GamificationSettingsPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const supabase = createClient();
  
  const [leaderboardOptOut, setLeaderboardOptOut] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    quiz_completed: true,
    streak_milestone: true,
    badge_earned: true,
    assignment_due: true,
    class_announcement: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load leaderboard opt-out status
      const { data: userData } = await supabase
        .from('users')
        .select('leaderboard_opt_out')
        .eq('id', user.id)
        .single();

      if (userData) {
        setLeaderboardOptOut(userData.leaderboard_opt_out || false);
      }

      // Load notification preferences
      const { data: prefData } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefData) {
        setPreferences({
          email_notifications: prefData.email_notifications,
          push_notifications: prefData.push_notifications,
          quiz_completed: prefData.quiz_completed,
          streak_milestone: prefData.streak_milestone,
          badge_earned: prefData.badge_earned,
          assignment_due: prefData.assignment_due,
          class_announcement: prefData.class_announcement,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderboardToggle = async (optOut: boolean) => {
    if (!user) return;

    try {
      setSaving(true);
      const { error } = await supabase
        .from('users')
        .update({ leaderboard_opt_out: optOut })
        .eq('id', user.id);

      if (error) throw error;

      setLeaderboardOptOut(optOut);
      toast({
        title: 'Settings Updated',
        description: optOut 
          ? 'You have been removed from the public leaderboard'
          : 'You are now visible on the public leaderboard',
      });
    } catch (error) {
      console.error('Error updating leaderboard preference:', error);
      toast({
        title: 'Error',
        description: 'Failed to update leaderboard preference',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    try {
      setSaving(true);
      const newPreferences = { ...preferences, [key]: value };

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved',
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gamification Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your XP, badges, and notification preferences</p>
      </div>

      {/* Leaderboard Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard Privacy
          </CardTitle>
          <CardDescription>
            Control your visibility on the public leaderboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="leaderboard-opt-out">Hide from Leaderboard</Label>
              <p className="text-sm text-muted-foreground">
                Your XP and rank will not be visible to other students
              </p>
            </div>
            <Switch
              id="leaderboard-opt-out"
              checked={leaderboardOptOut}
              onCheckedChange={handleLeaderboardToggle}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Delivery Methods */}
          <div className="space-y-4">
            <h3 className="font-semibold">Delivery Methods</h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences.email_notifications}
                onCheckedChange={(value) => handleNotificationToggle('email_notifications', value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications" className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  In-App Notifications
                </Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in the app
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences.push_notifications}
                onCheckedChange={(value) => handleNotificationToggle('push_notifications', value)}
                disabled={saving}
              />
            </div>
          </div>

          {/* Notification Types */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold">Notification Types</h3>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="quiz-completed">Quiz Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you complete a quiz
                </p>
              </div>
              <Switch
                id="quiz-completed"
                checked={preferences.quiz_completed}
                onCheckedChange={(value) => handleNotificationToggle('quiz_completed', value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="streak-milestone">Streak Milestones</Label>
                <p className="text-sm text-muted-foreground">
                  Celebrate your learning streaks
                </p>
              </div>
              <Switch
                id="streak-milestone"
                checked={preferences.streak_milestone}
                onCheckedChange={(value) => handleNotificationToggle('streak_milestone', value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="badge-earned">Badge Achievements</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you earn new badges
                </p>
              </div>
              <Switch
                id="badge-earned"
                checked={preferences.badge_earned}
                onCheckedChange={(value) => handleNotificationToggle('badge_earned', value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="assignment-due">Assignment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Reminders for upcoming assignments
                </p>
              </div>
              <Switch
                id="assignment-due"
                checked={preferences.assignment_due}
                onCheckedChange={(value) => handleNotificationToggle('assignment_due', value)}
                disabled={saving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="class-announcement">Class Announcements</Label>
                <p className="text-sm text-muted-foreground">
                  Updates from your teachers
                </p>
              </div>
              <Switch
                id="class-announcement"
                checked={preferences.class_announcement}
                onCheckedChange={(value) => handleNotificationToggle('class_announcement', value)}
                disabled={saving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-muted">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Privacy & Data</p>
              <p className="text-sm text-muted-foreground">
                Your gamification data is used only to enhance your learning experience. 
                You can opt out of the public leaderboard at any time, and your XP and badges 
                will remain private to you.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 mt-2" />
      </div>
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-6 w-12" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
