'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, 
  BarChart3, 
  ArrowRight, 
  FileText, 
  ClipboardCheck,
  Hammer,
  GraduationCap,
  Trophy,
  Bell,
  CheckCircle2
} from "lucide-react";
import Link from 'next/link';

const features = [
  {
    icon: Users,
    title: "Class Management",
    description: "Create classes with unique join codes. Students join instantly—no manual enrollment needed."
  },
  {
    icon: Hammer,
    title: "Test Builder",
    description: "Build custom tests from our question bank. Set time limits, due dates, and assign to specific classes."
  },
  {
    icon: ClipboardCheck,
    title: "Submissions & Grading",
    description: "Review student submissions in one place. See answers, scores, and time spent on each test."
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track class and individual performance. Identify weak topics and monitor progress over time."
  },
  {
    icon: GraduationCap,
    title: "Subject Organization",
    description: "Organize content by subjects and topics. Access questions sorted by difficulty and curriculum standards."
  },
  {
    icon: FileText,
    title: "Test Management",
    description: "View all your tests in one dashboard. Edit, duplicate, or archive tests as needed."
  }
];

const benefits = [
  "Save hours on test creation with ready-made question banks",
  "Track every student's progress without spreadsheets",
  "Identify struggling students before exams",
  "Keep students engaged with gamified learning",
  "Access from any device—desktop, tablet, or mobile"
];

const howItWorks = [
  {
    step: "1",
    title: "Create Your Class",
    description: "Set up a class in seconds and share the unique join code with your students."
  },
  {
    step: "2",
    title: "Build & Assign Tests",
    description: "Use our test builder to create assessments from our comprehensive question bank."
  },
  {
    step: "3",
    title: "Track Progress",
    description: "Monitor submissions and analyze performance with detailed analytics."
  }
];

export default function TeacherPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section - Mobile First */}
      <section className="pt-16 pb-12 px-4 sm:pt-20 sm:pb-16 md:pt-28 md:pb-20 bg-gradient-to-b from-muted/50 to-background">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-6">
            <GraduationCap className="h-4 w-4" />
            <span>For Teachers</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 sm:mb-6 leading-tight">
            Manage Classes. <br className="sm:hidden" />
            <span className="text-primary">Track Progress.</span> <br className="hidden sm:block" />
            Save Time.
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 px-2">
            The complete classroom management platform for modern educators. Create tests, track submissions, and monitor student performance—all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" className="w-full sm:w-auto text-base">
              <Link href="/signup?plan=teacher">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base">
              <Link href="/login?plan=teacher">
                I Already Have an Account
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid - Mobile Optimized */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Everything You Need to Teach Effectively
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Tools designed specifically for IGCSE classroom management
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <Card key={i} className="bg-card border hover:border-primary/50 transition-colors">
                <CardContent className="p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                      <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1.5">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Mobile First */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 sm:mb-3">
              Get Started in Minutes
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Simple setup, powerful results
            </p>
          </div>
          
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-6 md:gap-8">
            {howItWorks.map((item, i) => (
              <div key={i} className="relative">
                <div className="flex sm:flex-col items-start sm:items-center gap-4 sm:gap-3 p-4 sm:p-6 bg-background rounded-xl border sm:text-center">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-lg shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="hidden sm:block absolute top-1/2 -right-3 md:-right-4 transform -translate-y-1/2">
                    <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section - Mobile Optimized */}
      <section className="py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4 sm:mb-6">
                Why Teachers Choose IGA Prep
              </h2>
              <ul className="space-y-3 sm:space-y-4">
                {benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground text-sm sm:text-base">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6 sm:p-8 border border-primary/20">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">Student Engagement</p>
                    <p className="text-xs text-muted-foreground">XP, badges & leaderboards</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Real-time Analytics</p>
                    <p className="text-xs text-muted-foreground">Track progress instantly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <Bell className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Class Announcements</p>
                    <p className="text-xs text-muted-foreground">Keep students informed</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Mobile Optimized */}
      <section className="py-12 sm:py-16 md:py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Ready to Simplify Your Teaching?
          </h2>
          <p className="text-sm sm:text-base md:text-lg mb-6 sm:mb-8 opacity-90 max-w-xl mx-auto">
            Join IGA Prep today and spend less time on admin, more time on what matters—your students.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto shadow-lg">
              <Link href="/signup?plan=teacher">
                Create Your Free Account
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="text-xs sm:text-sm mt-4 opacity-75">
            No credit card required. Free to get started.
          </p>
        </div>
      </section>
    </div>
  );
}
