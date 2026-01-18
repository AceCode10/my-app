
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowRight, Users, BookOpen, GraduationCap, Clock, Mail, Check, X, Loader2 } from "lucide-react";
import { createClient } from '@/lib/supabase/client';
import { Badge } from "@/components/ui/badge";

interface ClassWithDetails {
    id: string;
    name: string;
    subject_id: string;
    subjects?: { name: string };
    users?: { display_name: string };
    _count?: { enrollments: number; assignments: number };
}

interface Invitation {
    id: string;
    class_id: string;
    invited_email: string;
    status: string;
    created_at: string;
    expires_at: string;
    classes?: {
        id: string;
        name: string;
        subjects?: { name: string };
        users?: { display_name: string };
    };
}

export default function ClassesPage() {
    const { user } = useUser();
    const supabase = createClient();
    const { toast } = useToast();
    
    const [classes, setClasses] = useState<ClassWithDetails[]>([]);
    const [invitations, setInvitations] = useState<Invitation[]>([]);
    const [isLoadingClasses, setIsLoadingClasses] = useState(true);
    const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);
    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [respondingTo, setRespondingTo] = useState<string | null>(null);
    
    useEffect(() => {
        if (user) {
            fetchClasses();
            fetchInvitations();
        }
    }, [user]);

    async function fetchClasses() {
        if (!user) return;
        
        try {
            // Get user's enrollments with class details in a single query
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    class_id,
                    classes (
                        id,
                        name,
                        subject_id,
                        subjects(name),
                        users!classes_teacher_id_fkey(display_name)
                    )
                `)
                .eq('user_id', user.id)
                .eq('status', 'active');

            if (enrollError) throw enrollError;

            if (!enrollments || enrollments.length === 0) {
                setClasses([]);
                setIsLoadingClasses(false);
                return;
            }

            const classIds = enrollments.map(e => e.class_id);

            // Get counts in parallel with batch queries
            const [enrollmentCounts, assignmentCounts] = await Promise.all([
                // Get all enrollment counts in one query
                supabase
                    .from('enrollments')
                    .select('class_id')
                    .in('class_id', classIds)
                    .eq('status', 'active'),
                // Get all assignment counts in one query
                supabase
                    .from('assignments')
                    .select('target_class_id')
                    .in('target_class_id', classIds)
            ]);

            // Count enrollments and assignments per class
            const enrollmentCountMap = new Map<string, number>();
            const assignmentCountMap = new Map<string, number>();

            enrollmentCounts.data?.forEach(e => {
                enrollmentCountMap.set(e.class_id, (enrollmentCountMap.get(e.class_id) || 0) + 1);
            });

            assignmentCounts.data?.forEach(a => {
                assignmentCountMap.set(a.target_class_id, (assignmentCountMap.get(a.target_class_id) || 0) + 1);
            });

            // Map the data with counts
            const classesWithCounts = enrollments.map(enrollment => {
                const cls = enrollment.classes as { id: string; name: string; subject_id: string; subjects?: { name: string }; users?: { display_name: string } };
                return {
                    id: cls.id,
                    name: cls.name,
                    subject_id: cls.subject_id,
                    subjects: cls.subjects,
                    users: cls.users,
                    _count: {
                        enrollments: enrollmentCountMap.get(cls.id) || 0,
                        assignments: assignmentCountMap.get(cls.id) || 0
                    }
                };
            });

            setClasses(classesWithCounts);
        } catch (error) {
            console.error('Error fetching classes:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load classes' });
        } finally {
            setIsLoadingClasses(false);
        }
    }

    async function fetchInvitations() {
        if (!user?.email) {
            setIsLoadingInvitations(false);
            return;
        }
        
        try {
            const { data, error } = await supabase
                .from('class_invitations')
                .select(`
                    *,
                    classes!inner(
                        id,
                        name,
                        teacher_id,
                        subjects(name)
                    )
                `)
                .eq('invited_email', user.email)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Fetch teacher information for each invitation
            const invitationsWithTeachers = await Promise.all(
                (data || []).map(async (invitation) => {
                    if (invitation.classes?.teacher_id) {
                        const { data: teacherData } = await supabase
                            .from('users')
                            .select('display_name')
                            .eq('id', invitation.classes.teacher_id)
                            .single();
                        
                        return {
                            ...invitation,
                            classes: {
                                ...invitation.classes,
                                users: teacherData
                            }
                        };
                    }
                    return invitation;
                })
            );

            setInvitations(invitationsWithTeachers);
        } catch (error) {
            console.error('Error fetching invitations:', error);
        } finally {
            setIsLoadingInvitations(false);
        }
    }

    const handleAcceptInvitation = async (invitation: Invitation) => {
        if (!user) return;
        setRespondingTo(invitation.id);

        try {
            // Update invitation status
            const { error: updateError } = await supabase
                .from('class_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id);

            if (updateError) throw updateError;

            toast({ 
                title: 'Invitation Accepted!', 
                description: `You have joined ${invitation.classes?.name || 'the class'}.` 
            });
            
            // Refresh both lists
            fetchClasses();
            fetchInvitations();
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not accept invitation.' });
        } finally {
            setRespondingTo(null);
        }
    };

    const handleDeclineInvitation = async (invitation: Invitation) => {
        setRespondingTo(invitation.id);

        try {
            const { error } = await supabase
                .from('class_invitations')
                .update({ status: 'declined' })
                .eq('id', invitation.id);

            if (error) throw error;

            toast({ 
                title: 'Invitation Declined', 
                description: `You have declined the invitation to ${invitation.classes?.name || 'the class'}.` 
            });
            
            fetchInvitations();
        } catch (error) {
            console.error('Error declining invitation:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not decline invitation.' });
        } finally {
            setRespondingTo(null);
        }
    };
    
    const handleJoinClass = async () => {
        if (!user || !classCode) return;
        setIsJoining(true);
        
        try {
            // Find class by join code
            const { data: classData, error: classError } = await supabase
                .from('classes')
                .select('*')
                .eq('join_code', classCode.trim().toUpperCase())
                .single();

            if (classError || !classData) {
                toast({ variant: "destructive", title: "Invalid Code", description: "No class found with that code. Please check and try again." });
                setIsJoining(false);
                return;
            }

            // Check if already enrolled
            const { data: existingEnrollment } = await supabase
                .from('enrollments')
                .select('*')
                .eq('user_id', user.id)
                .eq('class_id', classData.id)
                .single();

            if (existingEnrollment) {
                if (existingEnrollment.status === 'active') {
                    toast({ title: "Already Enrolled", description: `You are already in ${classData.name}.` });
                } else if (existingEnrollment.status === 'pending') {
                    toast({ title: "Request Pending", description: `Your request to join ${classData.name} is already pending approval.` });
                }
                setIsJoining(false);
                return;
            }

            // Create enrollment request - always pending, teacher must approve
            const { error: enrollError } = await supabase
                .from('enrollments')
                .insert({
                    user_id: user.id,
                    class_id: classData.id,
                    status: 'pending',
                    enrolled_at: new Date().toISOString()
                });

            if (enrollError) throw enrollError;

            toast({ title: "Request Sent!", description: `Your request to join ${classData.name} has been sent to the teacher for approval.` });
            setClassCode('');

        } catch (err) {
            console.error("Error joining class:", err);
            toast({ variant: "destructive", title: "Error", description: "Could not request to join the class. Please try again." });
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="">
            <h2 className="text-3xl font-bold text-foreground mb-4">My Classes</h2>
            <p className="text-muted-foreground mb-8">View enrolled classes or join with a code</p>
            
            {/* Pending Invitations Section */}
            {!isLoadingInvitations && invitations.length > 0 && (
                <Card className="mb-8 border-primary/50 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Class Invitations ({invitations.length})
                        </CardTitle>
                        <CardDescription>You have pending invitations from teachers</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {invitations.map((invitation) => (
                                <div 
                                    key={invitation.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background rounded-lg border gap-4"
                                >
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-foreground mb-1">
                                            {invitation.classes?.users?.display_name || 'A teacher'} has invited you to join {invitation.classes?.name || 'a class'}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                            <span>Subject: {invitation.classes?.subjects?.name || 'Unknown Subject'}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeclineInvitation(invitation)}
                                            disabled={respondingTo === invitation.id}
                                        >
                                            {respondingTo === invitation.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <X className="h-4 w-4 mr-1" />
                                                    Decline
                                                </>
                                            )}
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAcceptInvitation(invitation)}
                                            disabled={respondingTo === invitation.id}
                                        >
                                            {respondingTo === invitation.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Accept
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-foreground">Enrolled Classes</h3>
                    {isLoadingClasses ? (
                         Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
                    ) : classes && classes.length > 0 ? (
                        classes.map(cls => (
                            <Link href={`/student/classes/${cls.id}`} key={cls.id}>
                                <Card className="hover:border-primary transition-colors">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-xl">{cls.name}</CardTitle>
                                                <CardDescription className="mt-1">
                                                    {cls.subjects?.name || 'Unknown Subject'}
                                                </CardDescription>
                                            </div>
                                            <Badge variant="secondary">
                                                <GraduationCap className="h-3 w-3 mr-1" />
                                                Active
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-6 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4" />
                                                    <span>{cls._count?.enrollments || 0} students</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <BookOpen className="h-4 w-4" />
                                                    <span>{cls._count?.assignments || 0} assignments</span>
                                                </div>
                                                {cls.users && (
                                                    <div className="flex items-center gap-2">
                                                        <span>Teacher: {cls.users.display_name}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center text-primary font-semibold">
                                                View Class <ArrowRight className="ml-2 h-4 w-4" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                     ) : (
                        <Card className="text-center p-12 border-dashed">
                            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="font-semibold text-foreground mb-2">No Classes Yet</h3>
                            <p className="text-muted-foreground text-sm">Join a class using the code provided by your teacher.</p>
                        </Card>
                     )}
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Join a New Class</CardTitle>
                            <CardDescription>Enter the class code provided by your teacher</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Input 
                                    placeholder="Enter class code" 
                                    value={classCode}
                                    onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && classCode && !isJoining) {
                                            handleJoinClass();
                                        }
                                    }}
                                    className="text-center font-mono text-lg tracking-wider"
                                />
                                <Button 
                                    onClick={handleJoinClass} 
                                    disabled={isJoining || !classCode}
                                    className="w-full"
                                >
                                    {isJoining ? 'Joining...' : 'Join Class'}
                                </Button>
                            </div>
                            <div className="pt-4 border-t">
                                <p className="text-xs text-muted-foreground">
                                    💡 Ask your teacher for the class code to join their class.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
