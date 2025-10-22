'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from 'firebase/firestore';
import type { Subject } from '@/types';
import { allSubjects } from "@/lib/subjects";

interface NewClassInfo {
  name: string;
  subject: string;
  classCode: string;
}

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassCreated: (newClass: NewClassInfo) => void;
  isCreating: boolean;
}

const generateClassCode = (subject: string): string => {
    const subjectPrefix = subject.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X');
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${subjectPrefix}-${randomPart}`;
}

export function CreateClassModal({ isOpen, onClose, onClassCreated, isCreating }: CreateClassModalProps) {
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState(allSubjects);
  const isLoadingSubjects = false;


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className || !subject) {
        // Basic validation, can be replaced with toasts or form validation library
        alert("Please provide a class name and select a subject.");
        return;
    }
    const selectedSubjectName = subjects?.find(s => s.slug === subject)?.name || subject;
    const newCode = generateClassCode(selectedSubjectName);
    const newClass = {
        name: className,
        subject: selectedSubjectName,
        classCode: newCode
    };
    
    onClassCreated(newClass);
    
    if (!isCreating) {
      setClassName('');
      setSubject('');
    }
  };
  
  // Reset state when modal is closed/reopened
  useEffect(() => {
    if (isOpen) {
        setClassName('');
        setSubject('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Class</DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new class. A unique code will be generated for your students to join.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Class Name
              </Label>
              <Input 
                id="name" 
                placeholder="e.g., Grade 10 - Advanced Physics" 
                className="col-span-3"
                value={className}
                onChange={(e) => setClassName(e.target.value)} 
                required
               />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
               <Select onValueChange={setSubject} required value={subject}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder={isLoadingSubjects ? 'Loading...' : 'Select a subject'} />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => (
                    <SelectItem key={s.slug} value={s.slug}>{s.name} ({s.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isCreating || isLoadingSubjects}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating ? 'Creating...' : 'Create Class'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
