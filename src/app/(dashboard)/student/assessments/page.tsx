'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentList } from '@/components/assessment/AssessmentList';
import { ProgressDashboard } from '@/components/assessment/ProgressDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Assessment } from '@/types/assessment';
import { BookOpen, TrendingUp, Clock, Award } from 'lucide-react';

// Create supabase client outside component to prevent re-creation on every render
const supabase = createClient();

export default function StudentAssessmentsPage() {
  const router = useRouter();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [userAttempts, setUserAttempts] = useState<Map<string, number>>(new Map());
  const [topicMastery, setTopicMastery] = useState([]);
  const [assessmentStats, setAssessmentStats] = useState({
    total_attempts: 0,
    completed_attempts: 0,
    average_score: 0,
    average_percentage: 0,
    pass_rate: 0,
    total_time_spent: 0,
    best_score: 0,
    recent_attempts: []
  });
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // Load all data in PARALLEL for better performance
      const [assessmentsRes, attemptsRes, masteryRes, statsRes] = await Promise.all([
        // Load assessments
        supabase
          .from('assessments')
          .select(`
            *,
            assessment_type:assessment_types(*),
            subject:subjects(*),
            exam_board:exam_boards(*),
            topic:topics(*)
          `)
          .eq('is_published', true)
          .is('archived_at', null)
          .order('created_at', { ascending: false }),
        
        // Load user attempts count
        supabase
          .from('assessment_attempts')
          .select('assessment_id')
          .eq('user_id', user.id),
        
        // Load topic mastery
        supabase
          .from('topic_mastery')
          .select(`
            *,
            topic:topics(
              *,
              subject:subjects(*)
            )
          `)
          .eq('user_id', user.id)
          .order('mastery_percentage', { ascending: false }),
        
        // Load assessment statistics
        supabase
          .from('assessment_attempts')
          .select(`
            *,
            assessment:assessments(title)
          `)
          .eq('user_id', user.id)
          .in('status', ['submitted', 'graded'])
          .order('submitted_at', { ascending: false })
      ]);

      // Process assessments
      if (assessmentsRes.error) throw assessmentsRes.error;
      setAssessments(assessmentsRes.data || []);

      // Process attempts
      if (attemptsRes.error) throw attemptsRes.error;
      const attemptsMap = new Map<string, number>();
      attemptsRes.data?.forEach(attempt => {
        const count = attemptsMap.get(attempt.assessment_id) || 0;
        attemptsMap.set(attempt.assessment_id, count + 1);
      });
      setUserAttempts(attemptsMap);

      // Process mastery
      if (masteryRes.error) throw masteryRes.error;
      setTopicMastery(masteryRes.data || []);

      // Process stats
      if (statsRes.error) throw statsRes.error;
      const statsData = statsRes.data;

      if (statsData && statsData.length > 0) {
        const completed = statsData.filter(a => a.status === 'graded' || a.status === 'submitted');
        const passed = completed.filter(a => a.percentage && a.percentage >= 50);
        const totalTime = statsData.reduce((sum, a) => sum + (a.time_spent_seconds || 0), 0);
        const avgScore = completed.reduce((sum, a) => sum + (a.score || 0), 0) / completed.length;
        const avgPercentage = completed.reduce((sum, a) => sum + (a.percentage || 0), 0) / completed.length;
        const bestScore = Math.max(...completed.map(a => a.percentage || 0));

        setAssessmentStats({
          total_attempts: statsData.length,
          completed_attempts: completed.length,
          average_score: avgScore,
          average_percentage: avgPercentage,
          pass_rate: (passed.length / completed.length) * 100,
          total_time_spent: totalTime,
          best_score: bestScore,
          recent_attempts: statsData.slice(0, 10).map(a => ({
            id: a.id,
            assessment_title: a.assessment?.title || 'Unknown',
            score: a.score || 0,
            percentage: a.percentage || 0,
            completed_at: a.submitted_at || a.created_at
          }))
        });
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async (assessmentId: string) => {
    if (!userId) return;

    try {
      // Create new attempt
      const { data: attempt, error } = await supabase
        .from('assessment_attempts')
        .insert({
          assessment_id: assessmentId,
          user_id: userId,
          started_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to test interface
      router.push(`/student/assessments/${assessmentId}/take/${attempt.id}`);
    } catch (error) {
      console.error('Error starting assessment:', error);
      alert('Failed to start assessment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Assessments</h1>
        <p className="text-gray-600">
          Practice with past papers, topical questions, quizzes, and flashcards
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {assessments.length}
            </div>
            <div className="text-sm text-gray-600">Available</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <Award className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {assessmentStats.completed_attempts}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {assessmentStats.average_percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {Math.floor(assessmentStats.total_time_spent / 3600)}h
            </div>
            <div className="text-sm text-gray-600">Study Time</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="browse" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="browse">Browse Assessments</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="browse">
          <AssessmentList
            assessments={assessments}
            userAttempts={userAttempts}
            onStartAssessment={handleStartAssessment}
            showFilters={true}
          />
        </TabsContent>

        <TabsContent value="progress">
          <ProgressDashboard
            topicMastery={topicMastery}
            assessmentStats={assessmentStats}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
