
'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Image as ImageIcon } from 'lucide-react';

export default function AdminMediaPage() {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><ImageIcon className="mr-2" /> Media Library</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center py-20 text-muted-foreground">
                    <p>A unified media library for uploaded images and attachments is coming soon.</p>
                </div>
            </CardContent>
        </Card>
    );
}

    