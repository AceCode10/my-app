'use client';

import Link from 'next/link';
import { FileText, Target, BookOpen, Clock, TrendingUp, Play, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PracticeHubPage() {
  return (
    <div className="py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Play className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-4xl font-extrabold text-foreground">Practice Hub</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Choose your practice mode. Master topics or simulate full exam conditions.
        </p>
        <div className="mt-4">
          <Link href="/practice/history">
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              View Practice History
            </Button>
          </Link>
        </div>
      </div>

      {/* Practice Options */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Topical Questions */}
          <Link href="/resources/topical-questions">
            <Card className="h-full hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                    <Target className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>Topical Questions</CardTitle>
                    <CardDescription>Practice by topic</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Focus on specific topics to strengthen weak areas. Get instant feedback 
                  and track your mastery of each concept.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted px-2 py-1 rounded">Instant Feedback</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">Progress Tracking</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">All Topics</span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Past Papers */}
          <Link href="/resources/past-papers">
            <Card className="h-full hover:border-primary hover:shadow-lg transition-all cursor-pointer group">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-500/10 rounded-xl group-hover:bg-green-500/20 transition-colors">
                    <FileText className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <CardTitle>Past Papers</CardTitle>
                    <CardDescription>Full exam practice</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Practice with real past examination papers. Simulate exam conditions 
                  with timed sessions or take your time in practice mode.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-muted px-2 py-1 rounded">Timed Mode</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">Mark Schemes</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded">Multiple Years</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Stats / Features */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">Why Practice Here?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-card rounded-xl border">
              <Clock className="w-10 h-10 text-orange-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Timed Practice</h3>
              <p className="text-sm text-muted-foreground">
                Simulate real exam conditions with countdown timers
              </p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border">
              <TrendingUp className="w-10 h-10 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your improvement across topics and papers
              </p>
            </div>
            <div className="text-center p-6 bg-card rounded-xl border">
              <BookOpen className="w-10 h-10 text-blue-500 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground mb-2">Learn from Mistakes</h3>
              <p className="text-sm text-muted-foreground">
                Review answers with detailed explanations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
