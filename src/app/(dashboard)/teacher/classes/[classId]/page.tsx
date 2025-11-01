'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, BarChart, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@/hooks/use-user';

export default function ClassDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const classId = params.classId as string;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Class Details</h1>
            <p className="text-muted-foreground">Class ID: {classId}</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Under Development</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Class Management Coming Soon</h3>
            <p className="text-muted-foreground mb-4">
              This page is being migrated to our new system. You can still manage your classes from the main dashboard.
            </p>
            <Button onClick={() => router.push('/teacher')}>
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--%</div>
            <p className="text-xs text-muted-foreground">Coming soon</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
    const firestore = useFirestore();
    const [studentToRemove, setStudentToRemove] = useState<UserProfile | null>(null);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !studentIds || studentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
    }, [firestore, studentIds]);

    const { data: students, isLoading } = useCollection<UserProfile>(studentsQuery);

    const handleRemoveClick = (student: UserProfile) => {
        setStudentToRemove(student);
    };

    const handleRemoveConfirm = () => {
        if (onRemove && studentToRemove) {
            onRemove(studentToRemove.uid);
        }
        setStudentToRemove(null);
    }
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center space-x-6">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-24" />
                            {onRemove && <Skeleton className="h-9 w-24" />}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (!students || students.length === 0) {
        return <p className="text-muted-foreground text-center py-8">No students in this list.</p>
    }

    return (
        <>
            <div className="space-y-4">
                <h4 className="font-semibold text-foreground">{title} ({students.length})</h4>
                {students.map((student) => (
                    <div key={student.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-4">
                        <div className="flex items-center space-x-4">
                            <Avatar>
                                <AvatarImage src={student.photoURL ?? undefined} />
                                <AvatarFallback>{student.displayName?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <p className="font-medium text-foreground">{student.displayName}</p>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 text-sm self-end sm:self-center w-full sm:w-auto">
                            <div className="hidden sm:block">
                                <span className="text-muted-foreground">XP: </span>
                                <span className="font-semibold text-foreground">{student.xp?.toLocaleString() || 0}</span>
                            </div>
                             <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">View Progress</Button>
                            {onRemove && 
                                <Button variant="destructive" size="icon" onClick={() => handleRemoveClick(student)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            }
                        </div>
                    </div>
                ))}
            </div>
             <AlertDialog open={!!studentToRemove} onOpenChange={(open) => !open && setStudentToRemove(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Student</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove <span className="font-bold">{studentToRemove?.displayName}</span> from the class? They will need to request access again to rejoin.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRemoveConfirm}>Remove</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


const PendingRequestsList = ({ studentIds, onHandleRequest }: { studentIds: string[], onHandleRequest: (studentId: string, studentName: string, action: 'approve' | 'decline') => void }) => {
    const firestore = useFirestore();

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || !studentIds || studentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds.slice(0, 30)));
    }, [firestore, studentIds]);

    const { data: students, isLoading } = useCollection<UserProfile>(studentsQuery);
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                 <Skeleton className="h-6 w-48 mb-2" />
                 <Skeleton className="h-20 w-full" />
            </div>
        )
    }

    if (!students || students.length === 0) {
        return null; // Don't show the section if there are no pending requests
    }

    return (
        <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Pending Requests ({students.length})</h4>
            {students.map((student) => (
                <div key={student.uid} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-yellow-400/10 border border-yellow-400/30 rounded-lg dark:bg-yellow-900/30 dark:border-yellow-700/50">
                    <div className="flex items-center space-x-4">
                        <Avatar>
                            <AvatarImage src={student.photoURL ?? undefined} />
                            <AvatarFallback>{student.displayName?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-medium text-foreground">{student.displayName}</p>
                             <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                        <Button size="sm" variant="ghost" className="bg-green-500/10 text-green-700 hover:bg-green-500/20 dark:text-green-300 dark:hover:text-green-200" onClick={() => onHandleRequest(student.uid, student.displayName || 'Student', 'approve')}><Check className="mr-2 h-4 w-4" />Approve</Button>
                        <Button size="sm" variant="ghost" className="bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-400 dark:hover:text-red-300" onClick={() => onHandleRequest(student.uid, student.displayName || 'Student', 'decline')}><X className="mr-2 h-4 w-4" />Decline</Button>
                    </div>
                </div>
            ))}
        </div>
    );
};


const ClassAnalytics = ({ studentIds }: { studentIds: string[] }) => {
    const firestore = useFirestore();

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || studentIds.length === 0) return null;
        return query(collection(firestore, 'quizAttempts'), where('userId', 'in', studentIds));
    }, [firestore, studentIds]);

    const { data: attempts, isLoading } = useCollection<QuizAttempt>(attemptsQuery);
    
    const { averageScore, completionRate, topicScores } = useMemo(() => {
        if (!attempts) return { averageScore: 0, completionRate: 0, topicScores: [] };

        const totalAttempts = attempts.length;
        const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
        const totalQuestions = attempts.reduce((acc, a) => acc + a.totalQuestions, 0);

        const avgScore = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
        
        // This completion rate is a placeholder logic
        const completionRate = totalAttempts > 0 ? 92 : 0; 

        const scoresByTopic: { [topic: string]: { totalScore: number, count: number } } = {};
        attempts.forEach(attempt => {
            const topicKey = attempt.topic || 'General';
            if (!scoresByTopic[topicKey]) {
                scoresByTopic[topicKey] = { totalScore: 0, count: 0 };
            }
            scoresByTopic[topicKey].totalScore += (attempt.score / attempt.totalQuestions) * 100;
            scoresByTopic[topicKey].count++;
        });
        
        const topicData = Object.entries(scoresByTopic).map(([topic, data]) => ({
            name: topic,
            avgScore: Math.round(data.totalScore / data.count)
        }));

        return { averageScore: avgScore, completionRate, topicScores: topicData };
    }, [attempts]);

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>Average Score</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold text-primary">{averageScore}%</p>}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Assessments Completion</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-12 w-24" /> : <p className="text-4xl font-bold">{completionRate}%</p>}
                         <p className="text-sm text-muted-foreground">of assigned quizzes</p>
                    </CardContent>
                </Card>
            </div>
             <Card>
                <CardHeader>
                    <CardTitle>Performance by Topic</CardTitle>
                    <CardDescription>Average scores across different topics.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                         <ResponsiveContainer width="100%" height={300}>
                            <RechartsBarChart data={topicScores}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="avgScore" fill="#16a34a" name="Average Score" />
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

const AssignAssessmentModal = ({ classId, teacherId, isOpen, onClose }: { classId: string, teacherId: string, isOpen: boolean, onClose: () => void }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [selectedQuizId, setSelectedQuizId] = useState('');
    const [dueDate, setDueDate] = useState<Date>();
    const [timeLimit, setTimeLimit] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);

    const quizzesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'quizzes'), where('createdBy', '==', teacherId), where('visibility', '==', 'published'));
    }, [firestore, teacherId]);
    const { data: quizzes, isLoading } = useCollection<Quiz>(quizzesQuery);

    const handleAssign = async () => {
        if (!firestore || !selectedQuizId || !dueDate) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a quiz and a due date.' });
            return;
        }
        setIsAssigning(true);
        try {
            const selectedQuiz = quizzes?.find(q => q.id === selectedQuizId);
            if (!selectedQuiz) throw new Error('Selected quiz not found.');

            await addDoc(collection(firestore, 'assignments'), {
                quizId: selectedQuiz.id,
                quizTitle: selectedQuiz.title,
                classId,
                teacherId,
                subjectSlug: selectedQuiz.subject,
                topicSlug: selectedQuiz.topic,
                questionIds: selectedQuiz.questionIds || [],
                dueDate: Timestamp.fromDate(dueDate),
                timeLimit: timeLimit ? parseInt(timeLimit) : null,
                assignedAt: serverTimestamp(),
            });
            toast({ title: 'Assessment Assigned!', description: `${selectedQuiz.title} has been assigned to the class.` });
            onClose();
        } catch (error) {
            console.error('Error assigning assessment:', error);
            toast({ variant: 'destructive', title: 'Assignment Failed', description: 'Could not assign the assessment.' });
        } finally {
            setIsAssigning(false);
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Assign New Assessment</DialogTitle>
                    <DialogDescription>Select a quiz from your library to assign to this class.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="quiz">Quiz</Label>
                        <Select onValueChange={setSelectedQuizId} value={selectedQuizId}>
                            <SelectTrigger id="quiz">
                                <SelectValue placeholder={isLoading ? 'Loading quizzes...' : 'Select a quiz'} />
                            </SelectTrigger>
                            <SelectContent>
                                {quizzes?.map(quiz => (
                                    <SelectItem key={quiz.id} value={quiz.id}>{quiz.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="dueDate">Due Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="timeLimit">Time Limit (minutes, optional)</Label>
                        <Input id="timeLimit" type="number" value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="e.g., 45" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleAssign} disabled={isAssigning || isLoading}>
                        {isAssigning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AssessmentResultsDialog = ({ assignment, isOpen, onClose }: { assignment: Assignment; isOpen: boolean; onClose: () => void }) => {
    const firestore = useFirestore();

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore || !assignment) return null;
        return query(
            collection(firestore, 'quizAttempts'),
            where('classId', '==', assignment.classId),
            where('quizId', '==', assignment.quizId)
        );
    }, [firestore, assignment]);
    const { data: attempts, isLoading: isLoadingAttempts } = useCollection<QuizAttempt>(attemptsQuery);

    const studentIds = useMemo(() => {
        if (!attempts) return [];
        return Array.from(new Set(attempts.map(a => a.userId)));
    }, [attempts]);

    const studentsQuery = useMemoFirebase(() => {
        if (!firestore || studentIds.length === 0) return null;
        return query(collection(firestore, 'users'), where(documentId(), 'in', studentIds));
    }, [firestore, studentIds]);
    const { data: students, isLoading: isLoadingStudents } = useCollection<UserProfile>(studentsQuery);
    
    const combinedData = useMemo(() => {
        if (!attempts || !students) return [];
        return attempts.map(attempt => {
            const student = students.find(s => s.uid === attempt.userId);
            return {
                ...attempt,
                studentName: student?.displayName || 'Unknown Student',
                studentAvatar: student?.photoURL,
            };
        }).sort((a,b) => b.score - a.score);
    }, [attempts, students]);

    const isLoading = isLoadingAttempts || isLoadingStudents;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Results for "{assignment.quizTitle}"</DialogTitle>
                    <DialogDescription>Showing all student submissions for this assignment.</DialogDescription>
                </DialogHeader>
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    {isLoading ? (
                         <div className="space-y-4 py-4">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : combinedData.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No students have completed this assignment yet.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-right">Completed</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {combinedData.map(attempt => (
                                    <TableRow key={attempt.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar>
                                                    <AvatarImage src={attempt.studentAvatar} />
                                                    <AvatarFallback>{attempt.studentName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{attempt.studentName}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold">{attempt.score}/{attempt.totalQuestions}</TableCell>
                                        <TableCell className="text-right text-xs text-muted-foreground">
                                            {formatDistanceToNow(attempt.completedAt.toDate(), { addSuffix: true })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button>Close</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ScheduledAssessments = ({ classId, teacherId }: { classId: string, teacherId: string }) => {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
    const [resultsAssignment, setResultsAssignment] = useState<Assignment | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const assignmentsQuery = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return query(collection(firestore, 'assignments'), where('classId', '==', classId), orderBy('dueDate', 'desc'));
    }, [firestore, classId]);

    const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

    const handleDelete = async () => {
        if (!firestore || !assignmentToDelete) return;
        setIsDeleting(true);
        try {
            const assignmentRef = doc(firestore, 'assignments', assignmentToDelete.id);
            await deleteDoc(assignmentRef);
            toast({ title: "Assignment Deleted", description: "The assignment has been removed." });
            setAssignmentToDelete(null);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not delete assignment." });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Scheduled Assessments</CardTitle>
                        <CardDescription>Quizzes that have been assigned to this class.</CardDescription>
                    </div>
                     <Button onClick={() => setIsAssignModalOpen(true)}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Assign New
                    </Button>
                </CardHeader>
                <CardContent>
                     {isLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : !assignments || assignments.length === 0 ? (
                        <div className="text-center py-10 border-2 border-dashed rounded-lg">
                            <p className="text-muted-foreground">No assessments have been assigned to this class yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Quiz Title</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead className="hidden sm:table-cell">Time Limit</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assignments.map(assignment => (
                                        <TableRow key={assignment.id}>
                                            <TableCell className="font-medium">{assignment.quizTitle}</TableCell>
                                            <TableCell>{format(assignment.dueDate.toDate(), 'PPP')}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{assignment.timeLimit ? `${assignment.timeLimit} mins` : 'None'}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="sm" onClick={() => setResultsAssignment(assignment)}>View Results</Button>
                                                <Button variant="ghost" size="icon" onClick={() => setAssignmentToDelete(assignment)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
            {isAssignModalOpen && <AssignAssessmentModal classId={classId} teacherId={teacherId} isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} />}
            {resultsAssignment && <AssessmentResultsDialog assignment={resultsAssignment} isOpen={!!resultsAssignment} onClose={() => setResultsAssignment(null)} />}
            <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will un-assign the quiz for all students in this class. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete Assignment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};


const AnnouncementFeed = ({ classId }: { classId: string }) => {
    const firestore = useFirestore();
    if (!firestore) return null;

    const announcementsQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'classes', classId, 'announcements'), orderBy('createdAt', 'desc'));
    }, [firestore, classId]);

    const { data: announcements, isLoading } = useCollection<Announcement>(announcementsQuery);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {announcements && announcements.length > 0 ? (
                announcements.map(announcement => (
                    <div key={announcement.id} className="p-4 rounded-lg bg-muted/50">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{announcement.message}</p>
                        {announcement.noteId && announcement.notePath && (
                            <Link href={announcement.notePath}>
                                <div className="mt-3 p-3 border rounded-lg bg-background hover:bg-accent flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-primary"/>
                                    <div>
                                        <p className="font-semibold text-foreground text-sm">{announcement.noteTitle}</p>
                                        <p className="text-xs text-muted-foreground">Attached Revision Note</p>
                                    </div>
                                </div>
                            </Link>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                            - {announcement.authorName}, {formatDistanceToNow(announcement.createdAt.toDate(), { addSuffix: true })}
                        </p>
                    </div>
                ))
            ) : (
                <div className="text-center py-10 border-2 border-dashed rounded-lg">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">No announcements yet.</p>
                </div>
            )}
        </div>
    );
}

const AttachNoteDialog = ({ isOpen, onClose, onNoteSelect }: { isOpen: boolean, onClose: () => void, onNoteSelect: (note: Note) => void }) => {
    const { user } = useUser();
    const firestore = useFirestore();
    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'notes'), where('authorId', '==', user.uid), where('visibility', '==', 'public'));
    }, [firestore, user]);
    const { data: notes, isLoading } = useCollection<Note>(notesQuery);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attach a Revision Note</DialogTitle>
                    <DialogDescription>Select one of your published notes to attach to this announcement.</DialogDescription>
                </DialogHeader>
                 <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6 py-4 border-t border-b">
                    {isLoading ? <p>Loading notes...</p> : 
                        notes && notes.length > 0 ? (
                            <div className="space-y-2">
                                {notes.map(note => (
                                    <button key={note.id} onClick={() => onNoteSelect(note)} className="w-full text-left p-3 rounded-md hover:bg-muted">
                                        <p className="font-semibold">{note.title}</p>
                                        <p className="text-sm text-muted-foreground capitalize">{note.subjectId} / {note.topicId?.split('-').pop()}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                             <p className="text-sm text-muted-foreground text-center py-8">You have no published notes to attach. Create one from the "My Notes" tab.</p>
                        )}
                 </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const AnnouncementComposer = ({ classId }: { classId: string }) => {
    const [message, setMessage] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const [attachedNote, setAttachedNote] = useState<Note | null>(null);
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handlePost = async () => {
        if (!firestore || !user || !message.trim()) return;
        setIsPosting(true);

        try {
            const announcementsRef = collection(firestore, 'classes', classId, 'announcements');
            const announcementData: Omit<Announcement, 'id'> = {
                message,
                authorId: user.uid,
                authorName: user.displayName || 'Teacher',
                createdAt: serverTimestamp() as Timestamp,
                ...(attachedNote && {
                    noteId: attachedNote.id,
                    noteTitle: attachedNote.title,
                    notePath: `/dashboard/subjects/${attachedNote.subjectId}/${attachedNote.topicId.split('-').slice(1).join('-')}/notes`,
                })
            };
            await addDoc(announcementsRef, announcementData);
            setMessage('');
            setAttachedNote(null);
            toast({ title: "Announcement Posted" });
        } catch (error) {
            console.error("Error posting announcement:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not post announcement.' });
        } finally {
            setIsPosting(false);
        }
    };

    const handleNoteSelect = (note: Note) => {
        setAttachedNote(note);
        setIsAttachModalOpen(false);
    };

    return (
        <div className="space-y-3">
            <Textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write an announcement for your class..."
                rows={4}
            />
            {attachedNote && (
                <div className="flex items-center justify-between p-2 text-sm text-muted-foreground bg-muted rounded-md">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4"/>
                        <span>Attached: <span className="font-medium text-foreground">{attachedNote.title}</span></span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setAttachedNote(null)}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
            <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => setIsAttachModalOpen(true)}>
                    <Paperclip className="mr-2 h-4 w-4" /> Attach Note
                </Button>
                <Button onClick={handlePost} disabled={isPosting || !message.trim()}>
                    {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Post Announcement
                </Button>
            </div>
            <AttachNoteDialog isOpen={isAttachModalOpen} onClose={() => setIsAttachModalOpen(false)} onNoteSelect={handleNoteSelect}/>
        </div>
    );
};


const ClassSettings = ({ classData, classRef }: { classData: Class, classRef: any }) => {
    const router = useRouter();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { user } = useUser();
    const [className, setClassName] = useState(classData.name);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const handleSaveName = async () => {
        if (!firestore || !classRef || !className) return;
        setIsSaving(true);
        try {
            await updateDoc(classRef, { name: className });
            toast({ title: 'Class Renamed', description: 'The class name has been updated.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not rename the class.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteClass = async () => {
        if (!firestore || !classRef || !user) return;
        setIsDeleting(true);

        try {
            const batch = writeBatch(firestore);

            // Delete the class document itself
            batch.delete(classRef);

            // Query for and delete all assignments associated with this class
            const assignmentsQuery = query(collection(firestore, 'assignments'), where('classId', '==', classData.id));
            const assignmentsSnapshot = await getDocs(assignmentsQuery);
            assignmentsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();

            toast({ title: 'Class Deleted', description: 'The class and all its assignments have been permanently deleted.' });
            router.push('/teacher/classes');

        } catch (error) {
            console.error("Error deleting class:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the class.' });
        } finally {
            setIsDeleting(false);
            setIsDeleteDialogOpen(false);
        }
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>General Settings</CardTitle>
                    <CardDescription>Update the basic information for your class.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 max-w-md">
                        <div>
                            <Label htmlFor="className">Class Name</Label>
                            <Input id="className" value={className} onChange={(e) => setClassName(e.target.value)} />
                        </div>
                        <div>
                            <Label>Subject</Label>
                            <Input value={classData.subject} disabled />
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSaveName} disabled={isSaving || className === classData.name}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Danger Zone</CardTitle>
                    <CardDescription>These actions are permanent and cannot be undone.</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-between items-center">
                    <div>
                        <p className="font-semibold text-foreground">Delete this class</p>
                        <p className="text-sm text-muted-foreground">This will permanently delete the class and all its data.</p>
                    </div>
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                        <Trash2 className="mr-2 h-4 w-4"/>
                        Delete Class
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the class <span className="font-bold text-foreground">{classData.name}</span> and all associated assignments. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteClass} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                           {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}


export default function ClassDetailsPage() {
    const router = useRouter();
    const params = useParams();
    const classId = params.classId as string;
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const classRef = useMemoFirebase(() => {
        if (!firestore || !classId) return null;
        return doc(firestore, 'classes', classId);
    }, [firestore, classId]);
    
    const { data: classData, isLoading: isClassLoading } = useDoc<Class>(classRef);
    
    const handleRemoveStudent = async (studentId: string) => {
        if (!firestore || !classRef) return;
        
        try {
            await updateDoc(classRef, {
                studentIds: arrayRemove(studentId)
            });
            toast({
                title: "Student Removed",
                description: "The student has been successfully removed from the class.",
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: `Removal Failed`,
                description: `Could not remove the student. Please try again.`,
            });
        }
    };
    
    const handleStudentRequest = async (studentId: string, studentName: string, action: 'approve' | 'decline') => {
        if (!firestore || !classRef) return;
        
        try {
            if (action === 'approve') {
                await updateDoc(classRef, {
                    studentIds: arrayUnion(studentId),
                    pendingStudentIds: arrayRemove(studentId)
                });
                toast({
                    title: `Request Approved`,
                    description: `${studentName} has been added to the class.`,
                });
            } else { // Decline
                await updateDoc(classRef, {
                    pendingStudentIds: arrayRemove(studentId)
                });
                toast({
                    variant: 'default',
                    title: `Request Declined`,
                    description: `${studentName}'s request to join has been declined.`
                });
            }
        } catch (error) {
             toast({
                variant: 'destructive',
                title: `Action Failed`,
                description: `Could not process the request. Please try again.`,
            });
        }
    };


    if (isClassLoading) {
        return (
             <div>
                <Skeleton className="h-9 w-48 mb-4" />
                <div className="mb-8">
                    <Skeleton className="h-9 w-1/2 mb-2" />
                    <Skeleton className="h-5 w-1/4" />
                </div>
                <Skeleton className="h-[400px] w-full" />
            </div>
        )
    }

    if (!classData) {
        return (
            <div>
                 <Button variant="ghost" onClick={() => router.push('/teacher/dashboard/classes')} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to My Classes
                </Button>
                <div className="text-center py-20 bg-background rounded-2xl shadow-sm border border-dashed">
                    <h3 className="text-xl font-semibold text-foreground">Class Not Found</h3>
                    <p className="text-muted-foreground mt-2">The class you are looking for does not exist or you do not have permission to view it.</p>
                </div>
            </div>
        );
    }
    
    const handleCopyCode = () => {
        if (!classData.classCode) return;
        navigator.clipboard.writeText(classData.classCode);
        toast({
            title: 'Copied to Clipboard!',
            description: `Class code ${classData.classCode} has been copied.`,
        });
    };

    return (
        <div>
            <Button variant="ghost" onClick={() => router.push('/teacher/dashboard/classes')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to My Classes
            </Button>
            
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">{classData.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-muted-foreground">Class Code:</p>
                    <button onClick={handleCopyCode} className="font-mono text-sm bg-muted px-2 py-1 rounded-md hover:bg-muted/80 transition-colors">{classData.classCode}</button>
                </div>
            </div>

             <Tabs defaultValue="students" className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                    <TabsTrigger value="students"><Users className="mr-2 h-4 w-4"/>Students</TabsTrigger>
                    <TabsTrigger value="announcements"><MessageSquare className="mr-2 h-4 w-4"/>Announcements</TabsTrigger>
                    <TabsTrigger value="assessments"><FileText className="mr-2 h-4 w-4"/>Assessments</TabsTrigger>
                    <TabsTrigger value="analytics"><BarChart className="mr-2 h-4 w-4"/>Analytics</TabsTrigger>
                    <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4"/>Settings</TabsTrigger>
                </TabsList>
                <TabsContent value="students" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Student Management</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                           {classData.pendingStudentIds && classData.pendingStudentIds.length > 0 && <PendingRequestsList studentIds={classData.pendingStudentIds} onHandleRequest={handleStudentRequest} />}
                           <StudentList studentIds={classData.studentIds} title="Enrolled Students" onRemove={handleRemoveStudent} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="announcements" className="mt-6">
                    <Card>
                        <CardHeader><CardTitle>Announcements</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <AnnouncementComposer classId={classId} />
                            <AnnouncementFeed classId={classId} />
                        </CardContent>
                    </Card>
                </TabsContent>
                 <TabsContent value="assessments" className="mt-6">
                     <ScheduledAssessments classId={classId} teacherId={classData.teacherId} />
                </TabsContent>
                 <TabsContent value="analytics" className="mt-6">
                    <ClassAnalytics studentIds={classData.studentIds || []} />
                </TabsContent>
                 <TabsContent value="settings" className="mt-6">
                    <ClassSettings classData={classData} classRef={classRef} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
