
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const CustomResourceCard = ({ title, description, href, enabled = true }: { title: string; description: string; href: string; enabled?: boolean }) => {
    const content = (
        <Card className={cn("hover:shadow-lg transition-shadow h-full", !enabled && "opacity-50 bg-muted/50 cursor-not-allowed")}>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    {title}
                    {!enabled && <span className="text-xs bg-secondary text-secondary-foreground font-medium px-2 py-1 rounded-full">Coming Soon</span>}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );

    if (!enabled) {
        return <div>{content}</div>; // The div isn't focusable, preventing keyboard navigation
    }

    return <Link href={href}>{content}</Link>;
};


export default function ResourcesPage() {
  const resources = [
    {
      title: 'Past Papers',
      description: 'Practice with a collection of past exam papers to get a feel for the real thing.',
      href: '/resources/past-papers',
      enabled: true,
    },
    {
      title: 'Revision Notes',
      description: 'Concise and comprehensive notes to help you revise key topics and concepts.',
      href: '/resources/revision-notes',
      enabled: true,
    },
    {
      title: 'Quizzes',
      description: 'Test your knowledge with our range of quizzes and topical questions.',
      href: '/resources/quizzes',
      enabled: true,
    },
    {
      title: 'Flashcards',
      description: 'Use our flashcards to memorize key terms, definitions, and formulas.',
      href: '/resources/flashcards',
      enabled: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Resources</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {resources.map((resource) => (
          <CustomResourceCard key={resource.title} {...resource} />
        ))}
      </div>
    </div>
  );
}

    