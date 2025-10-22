
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Users, Bot, BarChart3, ArrowRight } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";

const features = [
  {
    icon: Users,
    title: "Effortless Class Management",
    description: "Create classes, generate unique join codes, and manage student enrollment with ease. Approve requests and see your class roster at a glance."
  },
  {
    icon: Bot,
    title: "AI-Powered Assessment Builder",
    description: "Save hours of prep time. Generate high-quality, syllabus-aligned quizzes for any topic in seconds using our advanced AI."
  },
  {
    icon: BarChart3,
    title: "Insightful Performance Analytics",
    description: "Go beyond scores. Track class-wide performance, identify common misconceptions by topic, and monitor individual student progress."
  }
];

export default function TeacherPage() {
  return (
    <div className="bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 md:pt-32 pb-12 md:pb-24 bg-muted/30">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight">
            Empower Your Teaching with <span className="text-primary">AI Tools</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            The ultimate toolkit for IGCSE teachers. Spend less time on admin and more time inspiring your students.
          </p>
          <div className="flex justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/signup?plan=teacher">Get Started for Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-4">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">Your All-in-One Teaching Assistant</h2>
                <p className="text-lg text-muted-foreground mt-2">Tools designed to save you time and enhance student learning.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
                {features.map((feature, i) => (
                    <Card key={i} className="bg-background shadow-sm hover:shadow-lg transition-shadow">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <feature.icon className="h-6 w-6 text-primary"/>
                            </div>
                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
      </section>
      
      {/* How it works Section */}
      <section className="py-16 sm:py-20 bg-muted/30">
          <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div>
                      <Image 
                        src="https://picsum.photos/seed/teacher_dashboard/800/600"
                        alt="Teacher dashboard screenshot"
                        width={800}
                        height={600}
                        className="rounded-lg shadow-2xl"
                        data-ai-hint="dashboard analytics"
                      />
                  </div>
                  <div>
                      <h2 className="text-3xl font-bold text-foreground mb-6">A Seamless Workflow for Modern Educators</h2>
                      <ul className="space-y-4 text-muted-foreground">
                          <li className="flex items-start">
                              <Check className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-1"/>
                              <div>
                                  <h4 className="font-semibold text-foreground">1. Create Your Class</h4>
                                  <p>Set up your classes in minutes and get a unique code to share with your students.</p>
                              </div>
                          </li>
                          <li className="flex items-start">
                              <Check className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-1"/>
                              <div>
                                  <h4 className="font-semibold text-foreground">2. Build or Generate Assessments</h4>
                                  <p>Create quizzes from scratch or let our AI generate them based on specific IGCSE topics.</p>
                              </div>
                          </li>
                          <li className="flex items-start">
                              <Check className="h-6 w-6 text-primary mr-3 flex-shrink-0 mt-1"/>
                              <div>
                                  <h4 className="font-semibold text-foreground">3. Assign & Analyze</h4>
                                  <p>Schedule assessments with due dates and track student performance in real-time on your analytics dashboard.</p>
                              </div>
                          </li>
                      </ul>
                       <Button asChild size="lg" className="mt-8">
                            <Link href="/signup?plan=teacher">
                                Start Empowering Your Students <ArrowRight className="ml-2 h-5 w-5"/>
                            </Link>
                        </Button>
                  </div>
              </div>
          </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Join Hundreds of Teachers Transforming Their Classrooms</h2>
              <p className="text-lg mb-8 opacity-90">Sign up today and discover a smarter way to teach.</p>
              <Button asChild size="lg" variant="secondary" className="shadow-lg">
                  <Link href="/signup?plan=teacher">Sign Up for a Teacher Account</Link>
              </Button>
          </div>
      </section>
    </div>
  );
}
