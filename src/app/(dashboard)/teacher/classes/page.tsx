

'use client';

import React, { useState } from 'react';
import { BookOpen, PlusCircle, Target, Users, ArrowRight, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { CreateClassModal } from '@/components/teacher/create-class-modal';
import { useClasses } from '@/hooks/use-classes';
import { Skeleton } from '@/components/ui/skeleton';
import { allSubjects } from '@/lib/subjects';
import type { Class } from '@/types';


const EmptyState = ({ onOpenModal }: { onOpenModal: () => void }) => (
    <div className="text-center bg-background p-8 sm:p-12 rounded-2xl border border-dashed">
        <Users className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
        <h3 className="mt-4 text-base sm:text-lg font-semibold text-foreground">No classes yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">Get started by creating your first class and inviting students.</p>
        <Button className="mt-6" onClick={onOpenModal}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Class
        </Button>
    </div>
);

const getSubjectVisuals = (subjectName: string) => {
    const subjectData = allSubjects.find(s => s.name.toLowerCase().includes(subjectName.toLowerCase().split(' ')[0]));
    if (subjectData) {
        return { icon: <subjectData.icon />, color: subjectData.color };
    }
    return { icon: <Book />, color: 'text-gray-500' };
};

export default function ClassesPage() {
    const router = useRouter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { classes, isLoading, createClass, isCreating } = useClasses();

    const handleClassCreated = async (newClass: { name: string; subject: string; classCode: string }) => {
        await createClass(newClass);
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            <CreateClassModal 
              isOpen={isModalOpen} 
              onClose={() => setIsModalOpen(false)}
              onClassCreated={handleClassCreated}
              isCreating={isCreating}
             />
            <div className="flex flex-col gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-foreground">My Classes</h2>
                    <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your classes, view student progress, and schedule assessments.</p>
                </div>
                <Button className="w-full sm:w-auto sm:self-start" onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Class
                </Button>
            </div>

            {isLoading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <Skeleton className="h-56 sm:h-64 w-full" />
                    <Skeleton className="h-56 sm:h-64 w-full" />
                 </div>
            ) : !classes || classes.length === 0 ? (
                <EmptyState onOpenModal={() => setIsModalOpen(true)} />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {classes.map(c => {
                        const { icon } = getSubjectVisuals(c.subject);
                        return (
                            <div key={c.id} className="bg-background p-4 sm:p-6 rounded-2xl shadow-sm border flex flex-col justify-between hover:border-primary transition-all duration-300 hover:shadow-lg">
                                <div>
                                    <div className="flex items-center space-x-3 sm:space-x-4 mb-4">
                                        <div className={`p-2 sm:p-3 rounded-lg bg-muted flex-shrink-0`}>
                                            {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5 sm:w-6 sm:h-6 text-primary" })}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-foreground text-base sm:text-lg truncate">{c.name}</h3>
                                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{c.subject}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 sm:space-y-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Students</span>
                                            <span className="font-medium text-foreground">{c.studentIds?.length || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Average Score</span>
                                            <span className="font-medium text-foreground">--%</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground">Class Code</span>
                                            <span className="font-mono text-xs bg-muted px-2 py-1 rounded-md text-foreground">{c.classCode}</span>
                                        </div>
                                    </div>
                                </div>
                                 <Button 
                                    variant="secondary" 
                                    className="mt-4 sm:mt-6 w-full"
                                    onClick={() => router.push(`/teacher/classes/${c.id}`)}
                                >
                                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
