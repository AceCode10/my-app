
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Zap, Users, BookOpen } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";

const testimonials = [
    {
        quote: "This platform transformed my study habits. The interactive quizzes are a game-changer for exam prep!",
        name: "Aisha Khan",
        title: "A Level Student",
        avatar: "1"
    },
    {
        quote: "As a teacher, I can finally track my students' progress effectively. Highly recommended for all educators.",
        name: "David Miller",
        title: "GCSE Teacher",
        avatar: "2"
    }
];

export default function LandingPage() {
    return (
        <div className="bg-background text-foreground">
            {/* Hero Section */}
             <section className="relative overflow-hidden pt-20 md:pt-32 pb-12 md:pb-24">
                <div className="absolute inset-0 bg-hero-pattern"></div>
                <Image 
                    src="https://picsum.photos/seed/hero/1920/1080" 
                    alt="Students collaborating"
                    fill
                    className="absolute inset-0 w-full h-full object-cover z-0 opacity-10"
                    data-ai-hint="students collaborating"
                />
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-foreground mb-4 leading-tight">
                        Master Your Exams with <span className="gradient-text">Confidence</span>
                    </h1>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                        The ultimate revision platform for GCSE, IGCSE, AS & A Level students. Access topical questions, past papers, and achieve top grades.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Button asChild size="lg" className="shadow-lg">
                            <Link href="/signup">Get Started for Free</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline">
                            <Link href="/signup?plan=teacher">I'm a teacher</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-16 sm:py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground">Why Choose Us?</h2>
                        <p className="text-lg text-muted-foreground mt-2">Everything you need to succeed in one place.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Interactive Quizzes</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Engage with dynamic quizzes that adapt to your learning style.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">For Students & Teachers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Tailored dashboards for both students and teachers to track progress.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expert Content</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Curated by experienced educators to match exam board syllabuses.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Personalized Feedback</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Get instant, detailed feedback to understand your strengths and weaknesses.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-16 sm:py-20 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-foreground">Loved by Students and Teachers Alike</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        {testimonials.map((testimonial, index) => (
                            <Card key={index} className="bg-background shadow-lg">
                                <CardContent className="pt-6 flex flex-col items-center text-center">
                                    <Image 
                                      src={`https://picsum.photos/seed/${testimonial.avatar}/100/100`} 
                                      alt={testimonial.name}
                                      width={80}
                                      height={80}
                                      className="rounded-full mb-4"
                                      data-ai-hint="portrait person"
                                    />
                                    <p className="text-muted-foreground italic mb-4">"{testimonial.quote}"</p>
                                    <div className="font-semibold text-foreground">{testimonial.name}</div>
                                    <div className="text-sm text-primary font-medium">{testimonial.title}</div>
                                 </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 sm:py-20 bg-primary text-primary-foreground">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
                    <p className="text-lg mb-8 opacity-90">Join thousands of users and start your journey to IGCSE success today.</p>
                    <Button asChild size="lg" variant="secondary" className="shadow-lg">
                        <Link href="/signup">Sign Up Now</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
