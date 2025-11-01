'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminUnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="p-4 rounded-full bg-yellow-500/10">
            <ShieldAlert className="h-16 w-16 text-yellow-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Access Restricted
        </h1>
        
        <p className="text-muted-foreground mb-8">
          This section is only available to Super Administrators. 
          As a Content Moderator, you have access to content management features.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/admin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
          
          <Button asChild variant="outline">
            <Link href="/admin/subjects">
              Go to Subjects
            </Link>
          </Button>
        </div>
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Your permissions:</strong> You can manage subjects, topics, questions, 
            past papers, and handle content approvals. Contact a Super Administrator if you 
            need additional access.
          </p>
        </div>
      </div>
    </div>
  );
}
