import * as LucideIcons from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import allSubjectsData from './subjects.json';

interface Paper {
    name: string;
    type: string;
    link: string;
}

interface PaperSession {
    year: number;
    session: string;
    papers: Paper[];
}

// Define a type for the raw subject data from JSON
export interface SubjectData {
    name: string;
    code: string;
    slug: string;
    icon: string; // Icon name is a string in the JSON
    color: string;
    practicals?: boolean;
    papers?: PaperSession[];
    topics?: { name: string; description: string; content_html?: string }[];
}

// Define the final, processed subject type where the icon is a component
export interface Subject extends Omit<SubjectData, 'icon'> {
    icon: LucideIcon;
}

// Helper function to map a string icon name to an actual Lucide icon component
const getIconComponent = (iconName: string): LucideIcon => {
    // Access the icon from the imported LucideIcons library
    const IconComponent = (LucideIcons as any)[iconName];
    // Return the component, or a default one if not found
    return IconComponent || LucideIcons.BookOpen;
};

// Process the raw JSON data into the final list of subjects with icon components.
// This is the single source of truth for subject data in the application.
export const allSubjects: Subject[] = (allSubjectsData as SubjectData[]).map((subject) => ({
    ...subject,
    icon: getIconComponent(subject.icon),
}));

// Function to get a subject by its slug.
// This function now safely references the already-processed `allSubjects` array.
export const getSubjectBySlug = (slug: string): Subject | undefined => {
    return allSubjects.find(s => s.slug === slug);
}
