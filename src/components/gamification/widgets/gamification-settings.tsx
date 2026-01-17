'use client';

/**
 * Gamification Settings Panel
 * Allows users to customize sound and animation preferences
 */

import { Volume2, VolumeX, Sparkles, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useGamificationStore } from '@/lib/gamification/stores/gamification-store';
import { soundManager } from '@/lib/gamification/sound-manager';

export function GamificationSettings() {
  const { 
    soundEnabled, 
    animationsEnabled, 
    celebrationIntensity,
    setSoundEnabled,
    setAnimationsEnabled,
    setCelebrationIntensity,
  } = useGamificationStore();

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundManager.setEnabled(enabled);
    
    // Play a test sound when enabling
    if (enabled) {
      soundManager.play('notification');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          Gamification Settings
        </CardTitle>
        <CardDescription>
          Customize your learning experience with sounds and animations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-green-500" />
            ) : (
              <VolumeX className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <Label htmlFor="sound-toggle" className="font-medium">
                Sound Effects
              </Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for XP gains, achievements, and more
              </p>
            </div>
          </div>
          <Switch
            id="sound-toggle"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {/* Animation Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className={`h-5 w-5 ${animationsEnabled ? 'text-yellow-500' : 'text-gray-400'}`} />
            <div>
              <Label htmlFor="animation-toggle" className="font-medium">
                Animations
              </Label>
              <p className="text-sm text-muted-foreground">
                Show animated celebrations and effects
              </p>
            </div>
          </div>
          <Switch
            id="animation-toggle"
            checked={animationsEnabled}
            onCheckedChange={setAnimationsEnabled}
          />
        </div>

        {/* Celebration Intensity */}
        {animationsEnabled && (
          <div className="space-y-3 pt-2 border-t">
            <Label className="font-medium">Celebration Intensity</Label>
            <RadioGroup
              value={celebrationIntensity}
              onValueChange={(value) => setCelebrationIntensity(value as 'minimal' | 'normal' | 'maximum')}
              className="grid grid-cols-3 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="minimal"
                  id="intensity-minimal"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="intensity-minimal"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-lg mb-1">✨</span>
                  <span className="text-sm font-medium">Minimal</span>
                  <span className="text-xs text-muted-foreground">Subtle</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="normal"
                  id="intensity-normal"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="intensity-normal"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-lg mb-1">🎉</span>
                  <span className="text-sm font-medium">Normal</span>
                  <span className="text-xs text-muted-foreground">Balanced</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="maximum"
                  id="intensity-maximum"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="intensity-maximum"
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-lg mb-1">🎆</span>
                  <span className="text-sm font-medium">Maximum</span>
                  <span className="text-xs text-muted-foreground">Party mode!</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
