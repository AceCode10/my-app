'use client';

import React, { useState } from 'react';
import { KodiLoading } from '@/components/ui/kodi-loading';
import { KodiLoadingHorizontal } from '@/components/ui/kodi-loading-horizontal';
import { KodiLoadingGif } from '@/components/ui/kodi-loading-gif';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoadingDemo() {
  const [horizontalDirection, setHorizontalDirection] = useState<'left-to-right' | 'right-to-left'>('left-to-right');
  const [gifSize, setGifSize] = useState<'sm' | 'md' | 'lg'>('md');

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Kodi Loading Animations</h1>
        <p className="text-muted-foreground">Compare the different loading animation styles</p>
      </div>

      <Tabs defaultValue="gif" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gif">GIF Animation</TabsTrigger>
          <TabsTrigger value="vertical">SVG Side Profile</TabsTrigger>
          <TabsTrigger value="horizontal">SVG Horizontal</TabsTrigger>
        </TabsList>

        <TabsContent value="gif" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>GIF Animation</CardTitle>
              <CardDescription>
                The original Kodi mascot GIF animation - lightweight and smooth
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <KodiLoadingGif size={gifSize} />
              
              <div className="mt-6 flex gap-2">
                <Button 
                  variant={gifSize === 'sm' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGifSize('sm')}
                >
                  Small
                </Button>
                <Button 
                  variant={gifSize === 'md' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGifSize('md')}
                >
                  Medium
                </Button>
                <Button 
                  variant={gifSize === 'lg' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGifSize('lg')}
                >
                  Large
                </Button>
              </div>

              <div className="mt-8 space-y-4 text-center">
                <div className="space-y-2">
                  <h3 className="font-medium">Features:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Pre-rendered GIF animation</li>
                    <li>• Smooth and consistent playback</li>
                    <li>• Multiple size options (sm, md, lg)</li>
                    <li>• Lightweight file size</li>
                    <li>• Works on all browsers</li>
                    <li>• Customizable text prop</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vertical" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SVG Side Profile Animation</CardTitle>
              <CardDescription>
                Kodi runs in place from a side view, perfect for standard loading states
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <KodiLoading />
              <div className="mt-8 space-y-4 text-center">
                <div className="space-y-2">
                  <h3 className="font-medium">Features:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Realistic running motion with alternating legs</li>
                    <li>• Arm pumping opposite to leg movement</li>
                    <li>• Forward lean for natural running posture</li>
                    <li>• Book held in right hand with flipping pages</li>
                    <li>• Motion lines and dust clouds for speed effect</li>
                    <li>• Customizable text prop</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="horizontal" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Horizontal Running Animation</CardTitle>
              <CardDescription>
                Kodi runs across the screen, ideal for progress indicators or longer loading times
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-full">
                <KodiLoadingHorizontal 
                  direction={horizontalDirection}
                  text={horizontalDirection === 'left-to-right' ? 'Loading Progress' : 'Loading Progress'}
                />
              </div>
              
              <div className="mt-6 flex gap-2">
                <Button 
                  variant={horizontalDirection === 'left-to-right' ? 'default' : 'outline'}
                  onClick={() => setHorizontalDirection('left-to-right')}
                >
                  Left to Right
                </Button>
                <Button 
                  variant={horizontalDirection === 'right-to-left' ? 'default' : 'outline'}
                  onClick={() => setHorizontalDirection('right-to-left')}
                >
                  Right to Left
                </Button>
              </div>

              <div className="mt-8 space-y-4 text-center">
                <div className="space-y-2">
                  <h3 className="font-medium">Features:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Runs horizontally across a track</li>
                    <li>• Progress dots along the bottom</li>
                    <li>• Start/finish lines for race effect</li>
                    <li>• Bi-directional running support</li>
                    <li>• Dust clouds that follow the motion</li>
                    <li>• 2-second loop cycle</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Examples</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">GIF Loading (Recommended):</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<KodiLoadingGif />
<KodiLoadingGif size="lg" />
<KodiLoadingGif text="Please wait" />`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">SVG Side Profile:</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<KodiLoading />
<KodiLoading text="Redirecting" />`}
                </pre>
              </div>
              <div>
                <h4 className="font-medium mb-2">SVG Horizontal:</h4>
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`<KodiLoadingHorizontal />
<KodiLoadingHorizontal 
  direction="right-to-left"
/>`}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">When to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">GIF Animation:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Default loading state</li>
                  <li>• Page transitions</li>
                  <li>• Authentication flows</li>
                  <li>• Best for mobile devices</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">SVG Animations:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• When GIF is unavailable</li>
                  <li>• Progress indicators</li>
                  <li>• Custom theming needed</li>
                  <li>• Horizontal for long operations</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
