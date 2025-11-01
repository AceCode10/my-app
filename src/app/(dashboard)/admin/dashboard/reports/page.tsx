
'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ShieldAlert } from 'lucide-react';

export default function AdminReportsPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><ShieldAlert className="mr-2" /> Moderation & Reports</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-20 text-muted-foreground">
                    <p>Content moderation queue and user reports interface coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}
