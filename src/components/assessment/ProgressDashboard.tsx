'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  Award, 
  Target, 
  Clock, 
  CheckCircle, 
  BookOpen,
  BarChart3,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TopicMastery {
  id: string;
  topic: {
    id: string;
    name: string;
    subject: {
      name: string;
    };
  };
  questions_attempted: number;
  questions_correct: number;
  mastery_percentage: number;
  last_practiced_at: string;
}

interface AssessmentStats {
  total_attempts: number;
  completed_attempts: number;
  average_score: number;
  average_percentage: number;
  pass_rate: number;
  total_time_spent: number;
  best_score: number;
  recent_attempts: Array<{
    id: string;
    assessment_title: string;
    score: number;
    percentage: number;
    completed_at: string;
  }>;
}

interface ProgressDashboardProps {
  topicMastery: TopicMastery[];
  assessmentStats: AssessmentStats;
  className?: string;
}

export function ProgressDashboard({
  topicMastery,
  assessmentStats,
  className
}: ProgressDashboardProps) {
  const overallMastery = topicMastery.length > 0
    ? topicMastery.reduce((sum, t) => sum + t.mastery_percentage, 0) / topicMastery.length
    : 0;

  const totalQuestionsAttempted = topicMastery.reduce((sum, t) => sum + t.questions_attempted, 0);
  const totalQuestionsCorrect = topicMastery.reduce((sum, t) => sum + t.questions_correct, 0);

  const getMasteryColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (percentage >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (percentage >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getMasteryLabel = (percentage: number) => {
    if (percentage >= 80) return 'Mastered';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Learning';
    return 'Needs Work';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Mastery */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Overall Mastery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 mb-2">
              {overallMastery.toFixed(1)}%
            </div>
            <Progress value={overallMastery} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">
              Across {topicMastery.length} topics
            </p>
          </CardContent>
        </Card>

        {/* Questions Answered */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Questions Answered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 mb-2">
              {totalQuestionsAttempted}
            </div>
            <div className="text-sm text-gray-600">
              {totalQuestionsCorrect} correct ({((totalQuestionsCorrect / totalQuestionsAttempted) * 100).toFixed(1)}%)
            </div>
          </CardContent>
        </Card>

        {/* Average Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 mb-2">
              {assessmentStats.average_percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">
              Best: {assessmentStats.best_score}%
            </div>
          </CardContent>
        </Card>

        {/* Study Time */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Study Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600 mb-2">
              {Math.floor(assessmentStats.total_time_spent / 3600)}h
            </div>
            <div className="text-sm text-gray-600">
              {assessmentStats.completed_attempts} assessments completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Tabs defaultValue="topics" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="topics">Topic Mastery</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        {/* Topic Mastery Tab */}
        <TabsContent value="topics" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Topic Mastery Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topicMastery
                  .sort((a, b) => b.mastery_percentage - a.mastery_percentage)
                  .map((topic) => (
                    <div key={topic.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">
                              {topic.topic.name}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {topic.topic.subject.name}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {topic.questions_correct} / {topic.questions_attempted} correct
                          </p>
                        </div>
                        <Badge className={getMasteryColor(topic.mastery_percentage)}>
                          {getMasteryLabel(topic.mastery_percentage)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={topic.mastery_percentage} 
                          className="flex-1 h-2"
                        />
                        <span className="text-sm font-medium text-gray-700 min-w-[50px] text-right">
                          {topic.mastery_percentage.toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Last practiced: {new Date(topic.last_practiced_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}

                {topicMastery.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No topics practiced yet</p>
                    <p className="text-sm mt-1">Start an assessment to track your progress</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="recent" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessmentStats.recent_attempts.map((attempt) => (
                  <div 
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {attempt.assessment_title}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {new Date(attempt.completed_at).toLocaleDateString()} at{' '}
                        {new Date(attempt.completed_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {attempt.percentage.toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-600">
                        {attempt.score} marks
                      </div>
                    </div>
                  </div>
                ))}

                {assessmentStats.recent_attempts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Performance Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Attempts</span>
                  <span className="font-semibold">{assessmentStats.total_attempts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed</span>
                  <span className="font-semibold">{assessmentStats.completed_attempts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pass Rate</span>
                  <span className="font-semibold text-green-600">
                    {assessmentStats.pass_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Average Score</span>
                  <span className="font-semibold text-blue-600">
                    {assessmentStats.average_score.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Best Score</span>
                  <span className="font-semibold text-purple-600">
                    {assessmentStats.best_score}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Improvement Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Improvement Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Weak Topics */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Topics Needing Attention
                    </h4>
                    <div className="space-y-2">
                      {topicMastery
                        .filter(t => t.mastery_percentage < 60)
                        .slice(0, 5)
                        .map(topic => (
                          <div key={topic.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{topic.topic.name}</span>
                            <Badge variant="outline" className="text-red-600">
                              {topic.mastery_percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      {topicMastery.filter(t => t.mastery_percentage < 60).length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          Great job! All topics above 60%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Strong Topics */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Strong Topics
                    </h4>
                    <div className="space-y-2">
                      {topicMastery
                        .filter(t => t.mastery_percentage >= 80)
                        .slice(0, 5)
                        .map(topic => (
                          <div key={topic.id} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{topic.topic.name}</span>
                            <Badge variant="outline" className="text-green-600">
                              {topic.mastery_percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        ))}
                      {topicMastery.filter(t => t.mastery_percentage >= 80).length === 0 && (
                        <p className="text-sm text-gray-500 italic">
                          Keep practicing to reach mastery!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
