
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore } from "@/firebase";
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion } from "firebase/firestore";
import type { Class } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasses } from "@/hooks/use-classes";
import Link from "next/link";
import { ArrowRight } from "lucide-react";


export default function ClassesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const { classes, isLoading: isLoadingClasses } = useClasses();

    const [classCode, setClassCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    
    const handleJoinClass = async () => {
        if (!firestore || !user || !classCode) return;
        setIsJoining(true);
        
        try {
            const classQuery = query(collection(firestore, 'classes'), where('classCode', '==', classCode.trim()));
            const querySnapshot = await getDocs(classQuery);

            if (querySnapshot.empty) {
                toast({ variant: "destructive", title: "Invalid Code", description: "No class found with that code. Please check and try again." });
                setIsJoining(false);
                return;
            }
            
            const classDoc = querySnapshot.docs[0];
            const classData = classDoc.data() as Class;

            if (classData.studentIds?.includes(user.uid)) {
                 toast({ title: "Already Enrolled", description: `You are already in ${classData.name}.` });
                 setIsJoining(false);
                 return;
            }

            if (classData.pendingStudentIds?.includes(user.uid)) {
                toast({ title: "Request Pending", description: `Your request to join ${classData.name} is already pending approval.` });
                setIsJoining(false);
                return;
           }

            const classRef = doc(firestore, 'classes', classDoc.id);
            await updateDoc(classRef, {
                pendingStudentIds: arrayUnion(user.uid)
            });

            toast({ title: "Request Sent!", description: `Your request to join ${classData.name} has been sent to the teacher.` });
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
            <p className="text-muted-foreground mb-8">View your current classes or join a new one.</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-xl font-bold text-foreground">Enrolled Classes</h3>
                    {isLoadingClasses ? (
                         Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)
                    ) : classes && classes.length > 0 ? (
                        classes.map(cls => (
                            <Link href={`/dashboard/classes/${cls.id}`} key={cls.id}>
                                <Card className="hover:border-primary transition-colors">
                                    <CardHeader>
                                        <CardTitle>{cls.name}</CardTitle>
                                        <CardDescription>{cls.subject}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-between items-center">
                                       <div className="text-sm text-muted-foreground">
                                           {cls.studentIds?.length || 0} students
                                       </div>
                                       <div className="flex items-center text-primary font-semibold">
                                           View Class <ArrowRight className="ml-2 h-4 w-4" />
                                       </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))
                     ) : (
                        <Card className="text-center p-12">
                            <p className="text-muted-foreground">You are not enrolled in any classes yet.</p>
                        </Card>
                     )}
                </div>
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Join a New Class</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">Enter the class code provided by your teacher.</p>
                            <div className="flex space-x-2">
                                <Input 
                                    placeholder="Class Code" 
                                    value={classCode}
                                    onChange={(e) => setClassCode(e.target.value)}
                                />
                                <Button onClick={handleJoinClass} disabled={isJoining || !classCode}>
                                    {isJoining ? 'Joining...' : 'Join'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
