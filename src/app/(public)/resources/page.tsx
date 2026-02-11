import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Target, FileText, BookOpen, Layers, ArrowRight, Sparkles, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AssessmentCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  features: string[];
  isPrimary?: boolean;
  enabled?: boolean;
}

const AssessmentCard = ({ title, description, href, icon, badge, features, isPrimary = false, enabled = true }: AssessmentCardProps) => {
  const content = (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-300 h-full flex flex-col",
      isPrimary 
        ? "border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1" 
        : "hover:shadow-lg hover:-translate-y-1",
      !enabled && "opacity-50 cursor-not-allowed"
    )}>
      {badge && (
        <div className="absolute top-3 right-3">
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            isPrimary ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          )}>
            {badge}
          </span>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
          isPrimary ? "bg-primary/20" : "bg-muted"
        )}>
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <ul className="space-y-2 mb-4 flex-grow">
          {features.map((feature, idx) => (
            <li key={idx} className="flex items-center text-sm text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5 mr-2 text-primary/70" />
              {feature}
            </li>
          ))}
        </ul>
        <Button 
          className={cn("w-full group/btn", isPrimary ? "" : "variant-outline")} 
          variant={isPrimary ? "default" : "outline"}
          disabled={!enabled}
        >
          {enabled ? 'Start Practicing' : 'Coming Soon'}
          {enabled && <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover/btn:translate-x-1" />}
        </Button>
      </CardContent>
    </Card>
  );

  if (!enabled) {
    return <div className="h-full">{content}</div>;
  }

  return <Link href={href} className="h-full block">{content}</Link>;
};

export default function ResourcesPage() {
  const assessments = [
    {
      title: 'Topical Questions',
      description: 'Master each concept with exam-style questions organized by topic.',
      href: '/resources/topical-questions',
      icon: <Target className="w-6 h-6 text-primary" />,
      badge: 'Recommended',
      features: [
        'Questions grouped by syllabus topics',
        'Instant feedback & explanations',
        'Track your progress per topic',
      ],
      isPrimary: true,
      enabled: true,
    },
    {
      title: 'Past Papers',
      description: 'Practice with real exam papers under timed conditions.',
      href: '/resources/past-papers',
      icon: <FileText className="w-6 h-6 text-blue-500" />,
      features: [
        'Full past exam papers',
        'Timed mock exam mode',
        'Mark schemes included',
      ],
      enabled: true,
    },
    {
      title: 'Revision Notes',
      description: 'Concise notes to help you revise key concepts quickly.',
      href: '/resources/revision-notes',
      icon: <BookOpen className="w-6 h-6 text-green-500" />,
      features: [
        'Syllabus-aligned content',
        'Key points highlighted',
        'Easy to understand',
      ],
      enabled: true,
    },
  ];

  const additionalResources = [
    {
      title: 'Quick Quizzes',
      description: 'Short quizzes to test your knowledge on the go.',
      href: '/resources/quizzes',
      icon: <Layers className="w-5 h-5 text-purple-500" />,
      enabled: true,
    },
  ];

  return (
    <div className="py-4">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-foreground mb-4">
          Study <span className="text-primary">Resources</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to ace your IGCSEs. Start with topical questions to build a strong foundation.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="max-w-4xl mx-auto mb-12">
        <div className="grid grid-cols-3 gap-4 bg-muted/30 rounded-2xl p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <Target className="w-5 h-5 text-primary" />
              1000+
            </div>
            <p className="text-sm text-muted-foreground">Practice Questions</p>
          </div>
          <div className="text-center border-x border-border">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <Clock className="w-5 h-5 text-blue-500" />
              50+
            </div>
            <p className="text-sm text-muted-foreground">Past Papers</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
              <TrendingUp className="w-5 h-5 text-green-500" />
              10+
            </div>
            <p className="text-sm text-muted-foreground">Subjects</p>
          </div>
        </div>
      </div>

      {/* Main Assessment Cards */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {assessments.map((assessment) => (
            <AssessmentCard key={assessment.title} {...assessment} />
          ))}
        </div>

        {/* Additional Resources */}
        <div className="border-t pt-8">
          <h2 className="text-lg font-semibold text-muted-foreground mb-4">More Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalResources.map((resource) => (
              <Link 
                key={resource.title} 
                href={resource.href}
                className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {resource.icon}
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{resource.title}</h3>
                  <p className="text-xs text-muted-foreground">{resource.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

    