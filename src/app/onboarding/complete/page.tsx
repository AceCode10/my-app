'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Search, Globe, GraduationCap, BookOpen, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getIconComponent } from '@/lib/icon-mapper';
import { COUNTRIES } from '@/lib/countries';

interface ExamBoard {
  id: string;
  name: string;
  code: string;
}

interface EducationLevel {
  id: string;
  name: string;
  description: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  icon_url?: string;
  color?: string;
  exam_board?: string;
  level?: string;
}

type OnboardingStep = 'country' | 'exam-board' | 'level' | 'subjects' | 'complete';

export default function CompleteOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('country');
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student');
  
  // Form state
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedExamBoards, setSelectedExamBoards] = useState<string[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  
  // Data
  const [examBoards, setExamBoards] = useState<ExamBoard[]>([]);
  const [levels, setLevels] = useState<EducationLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login?redirect=/onboarding/complete');
        return;
      }

      const { data: userRecord } = await supabase
        .from('users')
        .select('onboarding_completed, role')
        .eq('id', user.id)
        .single();

      if (userRecord?.onboarding_completed) {
        const redirectPath = userRecord.role === 'teacher' ? '/teacher' : '/student';
        router.push(redirectPath);
        return;
      }

      setUserRole(userRecord?.role || 'student');

      // Fetch exam boards
      const { data: boardsData } = await supabase
        .from('exam_boards')
        .select('id, name, code')
        .eq('status', 'active')
        .order('name');
      setExamBoards(boardsData || []);

      // Fetch education levels
      const { data: levelsData } = await supabase
        .from('education_levels')
        .select('id, name, description')
        .order('display_order');
      setLevels(levelsData || []);

      setIsLoading(false);
    };

    initialize();
  }, [router, supabase]);

  // Fetch subjects - try filtered first, fallback to all subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      let query = supabase
        .from('subjects')
        .select('id, name, code, icon_url, color, exam_board, level')
        .eq('status', 'published');
      
      // Try filtering by exam boards and levels if selected
      const levelsToFilter = userRole === 'student' && selectedLevel 
        ? [selectedLevel] 
        : selectedLevels;
      const hasFilters = selectedExamBoards.length > 0 || levelsToFilter.length > 0;
      
      if (selectedExamBoards.length > 0) {
        query = query.in('exam_board', selectedExamBoards);
      }
      
      if (levelsToFilter.length > 0) {
        query = query.in('level', levelsToFilter);
      }
      
      let { data, error } = await query.order('name');
      
      // If no subjects found with filters, fetch all published subjects
      if (!error && (!data || data.length === 0) && hasFilters) {
        const { data: allData, error: allError } = await supabase
          .from('subjects')
          .select('id, name, code, icon_url, color, exam_board, level')
          .eq('status', 'published')
          .order('name');
        
        if (!allError && allData) {
          data = allData;
        }
      }
      
      if (!error && data) {
        setSubjects(data);
      }
    };
    
    // Only fetch when we reach the subjects step
    if (currentStep === 'subjects') {
      fetchSubjects();
    }
  }, [supabase, selectedExamBoards, selectedLevel, selectedLevels, userRole, currentStep]);

  // Filter subjects based on search
  const filteredSubjects = useMemo(() => {
    if (!subjectSearch.trim()) return subjects;
    const search = subjectSearch.toLowerCase();
    return subjects.filter(s => 
      s.name.toLowerCase().includes(search) || 
      s.code.toLowerCase().includes(search)
    );
  }, [subjects, subjectSearch]);

  const handleNext = () => {
    if (currentStep === 'country') {
      setCurrentStep('exam-board');
    } else if (currentStep === 'exam-board') {
      setCurrentStep('level');
    } else if (currentStep === 'level') {
      setCurrentStep('subjects');
    } else if (currentStep === 'subjects') {
      handleComplete();
    }
  };

  const handleSkip = () => {
    if (currentStep === 'country') {
      setCurrentStep('exam-board');
    } else if (currentStep === 'exam-board') {
      setCurrentStep('level');
    } else if (currentStep === 'level') {
      setCurrentStep('subjects');
    } else if (currentStep === 'subjects') {
      handleSkipSubjects();
    }
  };

  const handleBack = () => {
    if (currentStep === 'exam-board') {
      setCurrentStep('country');
    } else if (currentStep === 'level') {
      setCurrentStep('exam-board');
    } else if (currentStep === 'subjects') {
      setCurrentStep('level');
    }
  };

  const handleSkipSubjects = async () => {
    // Allow skipping subjects - they can add later
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updateData: any = {
        onboarding_completed: true,
      };

      // Only save values that were selected
      if (selectedCountry) {
        updateData.country = selectedCountry;
      }
      if (selectedExamBoards.length > 0) {
        updateData.exam_boards = selectedExamBoards;
      }
      if (userRole === 'student' && selectedLevel) {
        updateData.level = selectedLevel;
      } else if (userRole === 'teacher' && selectedLevels.length > 0) {
        updateData.levels = selectedLevels;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Welcome!',
        description: 'Your profile has been set up. You can add subjects anytime in settings.',
      });

      const redirectPath = userRole === 'teacher' ? '/teacher' : '/student';
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to complete setup. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    // If no subjects selected, use skip flow
    if (selectedSubjects.length === 0) {
      handleSkipSubjects();
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update user profile - only save values that were selected
      const updateData: any = {
        onboarding_completed: true,
      };

      if (selectedCountry) {
        updateData.country = selectedCountry;
      }
      if (selectedExamBoards.length > 0) {
        updateData.exam_boards = selectedExamBoards;
      }
      if (userRole === 'student' && selectedLevel) {
        updateData.level = selectedLevel;
      } else if (userRole === 'teacher' && selectedLevels.length > 0) {
        updateData.levels = selectedLevels;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Add selected subjects
      const { error: subjectsError } = await supabase
        .from('user_subjects')
        .insert(
          selectedSubjects.map(subject_id => ({
            user_id: user.id,
            subject_id,
          }))
        );

      if (subjectsError) throw subjectsError;

      toast({
        title: 'Welcome!',
        description: 'Your profile has been set up successfully.',
      });

      const redirectPath = userRole === 'teacher' ? '/teacher' : '/student';
      router.push(redirectPath);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to complete setup. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to RevisionPlus</h1>
          <p className="text-muted-foreground">
            Let's personalize your experience in just a few steps
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === 'country' ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
              )}>
                {currentStep === 'country' ? <Globe className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Country</span>
            </div>
            <div className="w-8 h-0.5 bg-muted" />
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === 'exam-board' ? "bg-primary text-primary-foreground" : 
                currentStep === 'country' ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
              )}>
                2
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Board</span>
            </div>
            <div className="w-8 h-0.5 bg-muted" />
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === 'level' ? "bg-primary text-primary-foreground" : 
                ['country', 'exam-board'].includes(currentStep) ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"
              )}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Level</span>
            </div>
            <div className="w-8 h-0.5 bg-muted" />
            <div className="flex flex-col items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                currentStep === 'subjects' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-xs mt-1 text-muted-foreground">Subjects</span>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'country' && 'Where are you located?'}
              {currentStep === 'exam-board' && 'Select Your Exam Board(s)'}
              {currentStep === 'level' && (userRole === 'student' ? 'Select Your Education Level' : 'Select Education Levels You Teach')}
              {currentStep === 'subjects' && 'Select Your Subjects'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'country' && 'This helps us customize content for your region'}
              {currentStep === 'exam-board' && 'Choose the exam board(s) you are studying or teaching'}
              {currentStep === 'level' && (userRole === 'student' 
                ? 'Choose your current education level' 
                : 'Choose all the levels you teach')}
              {currentStep === 'subjects' && 'Choose the subjects you want to focus on. You can always add more later.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 'country' && (
              <div className="max-w-md mx-auto">
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="w-full h-12">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COUNTRIES.map(country => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Your country helps us show relevant exam boards and content.
                </p>
              </div>
            )}

            {currentStep === 'exam-board' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {examBoards.map(board => (
                  <Label
                    key={board.id}
                    htmlFor={`board-${board.id}`}
                    className={cn(
                      "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                      selectedExamBoards.includes(board.code) && "border-primary bg-primary/5"
                    )}
                  >
                    <Checkbox
                      id={`board-${board.id}`}
                      checked={selectedExamBoards.includes(board.code)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExamBoards([...selectedExamBoards, board.code]);
                        } else {
                          setSelectedExamBoards(selectedExamBoards.filter(b => b !== board.code));
                        }
                      }}
                      className="mr-4"
                    />
                    <div>
                      <div className="font-semibold">{board.name}</div>
                      <div className="text-sm text-muted-foreground">{board.code.toUpperCase()}</div>
                    </div>
                  </Label>
                ))}
              </div>
            )}

            {currentStep === 'level' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {levels.map(level => (
                  <Label
                    key={level.id}
                    htmlFor={`level-${level.id}`}
                    className={cn(
                      "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                      (userRole === 'student' 
                        ? selectedLevel === level.id 
                        : selectedLevels.includes(level.id)) && "border-primary bg-primary/5"
                    )}
                  >
                    {userRole === 'student' ? (
                      <input
                        type="radio"
                        id={`level-${level.id}`}
                        name="level"
                        checked={selectedLevel === level.id}
                        onChange={() => setSelectedLevel(level.id)}
                        className="mr-4"
                      />
                    ) : (
                      <Checkbox
                        id={`level-${level.id}`}
                        checked={selectedLevels.includes(level.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLevels([...selectedLevels, level.id]);
                          } else {
                            setSelectedLevels(selectedLevels.filter(l => l !== level.id));
                          }
                        }}
                        className="mr-4"
                      />
                    )}
                    <div>
                      <div className="font-semibold">{level.name}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </div>
                  </Label>
                ))}
              </div>
            )}

            {currentStep === 'subjects' && (
              <div className="space-y-4">
                {/* Search bar */}
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subjects..."
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {/* Selected count */}
                {selectedSubjects.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <CheckCircle className="h-4 w-4" />
                    <span>{selectedSubjects.length} subject{selectedSubjects.length !== 1 ? 's' : ''} selected</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2">
                {filteredSubjects.map(subject => {
                  const IconComponent = getIconComponent(subject.icon_url);
                  return (
                    <Label
                      key={subject.id}
                      htmlFor={`subject-${subject.id}`}
                      className={cn(
                        "flex items-center p-4 rounded-lg border bg-background hover:bg-muted/50 transition-colors cursor-pointer",
                        selectedSubjects.includes(subject.id) && "border-primary bg-primary/5"
                      )}
                    >
                      <Checkbox
                        id={`subject-${subject.id}`}
                        checked={selectedSubjects.includes(subject.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSubjects([...selectedSubjects, subject.id]);
                          } else {
                            setSelectedSubjects(selectedSubjects.filter(s => s !== subject.id));
                          }
                        }}
                        className="mr-4"
                      />
                      <div className="flex items-center space-x-3">
                        <div 
                          className="p-2 rounded-lg text-white flex items-center justify-center w-10 h-10"
                          style={{ backgroundColor: subject.color || '#3b82f6' }}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="font-semibold block">{subject.name}</span>
                          <span className="text-xs text-muted-foreground">{subject.code}</span>
                        </div>
                      </div>
                    </Label>
                  );
                })}
                </div>

                {filteredSubjects.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No subjects found matching "{subjectSearch}"</p>
                )}
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 'country' || isSaving}
              >
                Back
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  onClick={handleSkip} 
                  disabled={isSaving}
                >
                  Skip
                </Button>
                <Button onClick={handleNext} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : currentStep === 'subjects' ? (
                    'Complete Setup'
                  ) : (
                    'Next'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
