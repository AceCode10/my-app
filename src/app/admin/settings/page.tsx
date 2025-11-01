'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Settings as SettingsIcon,
  Database,
  Shield,
  Bell,
  Mail,
  Save
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    // General
    siteName: 'IGCSE Simplified',
    siteDescription: 'Your comprehensive IGCSE exam preparation platform',
    supportEmail: 'support@igcsesimplified.com',
    
    // Features
    enableSignups: true,
    enableGoogleAuth: true,
    enableNotifications: true,
    enableEmailDigest: false,
    
    // Content
    defaultContentStatus: 'draft',
    requireApproval: true,
    autoPublishAfterApproval: true,
    
    // Limits
    guestNoteLimit: 5,
    basicNoteLimit: 20,
    guestFlashcardLimit: 10,
    basicFlashcardLimit: 50,
    
    // Storage
    maxFileSize: 50,
    allowedFileTypes: '.pdf,.jpg,.png',
    
    // Security
    sessionTimeout: 24,
    passwordMinLength: 8,
    requireEmailVerification: true,
    enableRateLimiting: true
  });

  async function handleSave() {
    setSaving(true);
    
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: 'Success',
      description: 'Settings saved successfully'
    });
    
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Basic platform configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription">Site Description</Label>
            <Textarea
              id="siteDescription"
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support Email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Feature Toggles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Feature Toggles
          </CardTitle>
          <CardDescription>Enable or disable platform features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>User Signups</Label>
              <p className="text-sm text-muted-foreground">
                Allow new users to create accounts
              </p>
            </div>
            <Switch
              checked={settings.enableSignups}
              onCheckedChange={(checked) => setSettings({ ...settings, enableSignups: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Google Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Enable sign in with Google
              </p>
            </div>
            <Switch
              checked={settings.enableGoogleAuth}
              onCheckedChange={(checked) => setSettings({ ...settings, enableGoogleAuth: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable in-app notifications
              </p>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, enableNotifications: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email Digest</Label>
              <p className="text-sm text-muted-foreground">
                Send weekly email digests to users
              </p>
            </div>
            <Switch
              checked={settings.enableEmailDigest}
              onCheckedChange={(checked) => setSettings({ ...settings, enableEmailDigest: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Content Management
          </CardTitle>
          <CardDescription>Configure content workflow and approval</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Approval</Label>
              <p className="text-sm text-muted-foreground">
                Content must be approved before publishing
              </p>
            </div>
            <Switch
              checked={settings.requireApproval}
              onCheckedChange={(checked) => setSettings({ ...settings, requireApproval: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto-Publish After Approval</Label>
              <p className="text-sm text-muted-foreground">
                Automatically publish content when approved
              </p>
            </div>
            <Switch
              checked={settings.autoPublishAfterApproval}
              onCheckedChange={(checked) => setSettings({ ...settings, autoPublishAfterApproval: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Usage Limits */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Limits</CardTitle>
          <CardDescription>Set limits for different user tiers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="guestNoteLimit">Guest Note Limit (per week)</Label>
              <Input
                id="guestNoteLimit"
                type="number"
                value={settings.guestNoteLimit}
                onChange={(e) => setSettings({ ...settings, guestNoteLimit: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basicNoteLimit">Basic Note Limit (per week)</Label>
              <Input
                id="basicNoteLimit"
                type="number"
                value={settings.basicNoteLimit}
                onChange={(e) => setSettings({ ...settings, basicNoteLimit: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="guestFlashcardLimit">Guest Flashcard Limit (per week)</Label>
              <Input
                id="guestFlashcardLimit"
                type="number"
                value={settings.guestFlashcardLimit}
                onChange={(e) => setSettings({ ...settings, guestFlashcardLimit: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basicFlashcardLimit">Basic Flashcard Limit (per week)</Label>
              <Input
                id="basicFlashcardLimit"
                type="number"
                value={settings.basicFlashcardLimit}
                onChange={(e) => setSettings({ ...settings, basicFlashcardLimit: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Storage & Files</CardTitle>
          <CardDescription>Configure file upload settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
            <Input
              id="maxFileSize"
              type="number"
              value={settings.maxFileSize}
              onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedFileTypes">Allowed File Types</Label>
            <Input
              id="allowedFileTypes"
              value={settings.allowedFileTypes}
              onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
              placeholder=".pdf,.jpg,.png"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of file extensions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Configure security and authentication settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
              <Input
                id="sessionTimeout"
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordMinLength">Min Password Length</Label>
              <Input
                id="passwordMinLength"
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Require Email Verification</Label>
              <p className="text-sm text-muted-foreground">
                Users must verify email before accessing platform
              </p>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Rate Limiting</Label>
              <p className="text-sm text-muted-foreground">
                Protect against abuse with rate limiting
              </p>
            </div>
            <Switch
              checked={settings.enableRateLimiting}
              onCheckedChange={(checked) => setSettings({ ...settings, enableRateLimiting: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        <p className="text-sm text-muted-foreground">
          Changes will take effect immediately
        </p>
      </div>
    </div>
  );
}
