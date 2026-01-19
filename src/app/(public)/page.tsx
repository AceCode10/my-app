'use client';
import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Zap, Users, BookOpen, GraduationCap, Microscope, Calculator, Globe, Atom, BookText, FlaskConical, Music, Palette, Languages, Binary } from "lucide-react";
import Link from 'next/link';
import Image from "next/image";
import { cn } from "@/lib/utils";

// Rotating words with their colors
const rotatingWords = [
  { text: "Learning", color: "bg-emerald-500" },
  { text: "Teaching", color: "bg-blue-500" },
  { text: "Studying", color: "bg-purple-500" },
  { text: "Everything!", color: "bg-orange-500" },
];

// Exam boards for the sliding carousel with logo paths
const examBoards = [
  { 
    id: 'cambridge', 
    name: 'Cambridge (CIE)', 
    shortName: 'CIE',
    color: 'bg-red-500',
    description: 'Cambridge Assessment International Education',
    levels: ['IGCSE', 'AS Level', 'A Level'],
    logo: '/exam-board-logos/caie.png'
  },
  { 
    id: 'edexcel', 
    name: 'Edexcel', 
    shortName: 'Edexcel',
    color: 'bg-purple-500',
    description: 'Pearson Edexcel',
    levels: ['GCSE', 'IGCSE', 'AS Level', 'A Level'],
    logo: '/exam-board-logos/Edexcel.svg'
  },
  { 
    id: 'aqa', 
    name: 'AQA', 
    shortName: 'AQA',
    color: 'bg-orange-500',
    description: 'Assessment and Qualifications Alliance',
    levels: ['GCSE', 'AS Level', 'A Level'],
    logo: '/exam-board-logos/AQA.svg'
  },
  { 
    id: 'ocr', 
    name: 'OCR', 
    shortName: 'OCR',
    color: 'bg-green-500',
    description: 'Oxford Cambridge and RSA',
    levels: ['GCSE', 'AS Level', 'A Level'],
    logo: '/exam-board-logos/OCR.PNG'
  },
  { 
    id: 'ib', 
    name: 'IB', 
    shortName: 'IB',
    color: 'bg-blue-600',
    description: 'International Baccalaureate',
    levels: ['MYP', 'Diploma Programme'],
    logo: '/exam-board-logos/IB.png'
  },
  { 
    id: 'ap', 
    name: 'AP', 
    shortName: 'AP',
    color: 'bg-indigo-500',
    description: 'Advanced Placement (College Board)',
    levels: ['AP Courses'],
    logo: '/exam-board-logos/AP.png'
  },
];

// Floating subject icons for animated background
const floatingIcons = [
  { Icon: Microscope, color: 'text-emerald-400', size: 32, delay: 0, duration: 20, x: 5, y: 10 },
  { Icon: Calculator, color: 'text-blue-400', size: 28, delay: 2, duration: 25, x: 15, y: 60 },
  { Icon: Globe, color: 'text-purple-400', size: 36, delay: 4, duration: 22, x: 25, y: 30 },
  { Icon: Atom, color: 'text-orange-400', size: 30, delay: 1, duration: 28, x: 35, y: 70 },
  { Icon: BookText, color: 'text-pink-400', size: 26, delay: 3, duration: 24, x: 45, y: 20 },
  { Icon: FlaskConical, color: 'text-cyan-400', size: 34, delay: 5, duration: 26, x: 55, y: 50 },
  { Icon: Music, color: 'text-yellow-400', size: 24, delay: 2.5, duration: 21, x: 65, y: 80 },
  { Icon: Palette, color: 'text-red-400', size: 32, delay: 1.5, duration: 23, x: 75, y: 15 },
  { Icon: Languages, color: 'text-indigo-400', size: 28, delay: 4.5, duration: 27, x: 85, y: 45 },
  { Icon: Binary, color: 'text-green-400', size: 30, delay: 3.5, duration: 19, x: 92, y: 75 },
  { Icon: Microscope, color: 'text-teal-400', size: 24, delay: 6, duration: 30, x: 10, y: 85 },
  { Icon: Calculator, color: 'text-violet-400', size: 26, delay: 7, duration: 18, x: 50, y: 5 },
];

// Floating Icons Background Component
function FloatingIconsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
      
      {/* Floating icons */}
      {floatingIcons.map((item, index) => (
        <div
          key={index}
          className={`absolute ${item.color} opacity-20 animate-float`}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          <item.Icon size={item.size} />
        </div>
      ))}
      
      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-20px) rotate(5deg);
          }
          50% {
            transform: translateY(-10px) rotate(-3deg);
          }
          75% {
            transform: translateY(-25px) rotate(3deg);
          }
        }
        
        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// Animated Rotating Text Component with slide-down effect
function RotatingText() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      // Start exit animation (slide down and fade out)
      setIsExiting(true);
      
      setTimeout(() => {
        // Change word and start enter animation (slide down from top)
        setCurrentIndex((prev) => (prev + 1) % rotatingWords.length);
        setIsExiting(false);
        setIsEntering(true);
        
        setTimeout(() => {
          setIsEntering(false);
        }, 300);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  const currentWord = rotatingWords[currentIndex];

  return (
    <span className="relative inline-flex justify-start overflow-hidden h-[1.2em] w-[200px] sm:w-[280px] md:w-[320px] lg:w-[380px] align-bottom">
      <span
        className={cn(
          "absolute left-0 inline-flex items-center justify-center px-4 py-1 rounded-lg text-white font-extrabold transition-all duration-300 ease-out",
          currentWord.color,
          isExiting && "translate-y-full opacity-0",
          isEntering && "-translate-y-full opacity-0",
          !isExiting && !isEntering && "translate-y-0 opacity-100"
        )}
      >
        {currentWord.text}
      </span>
    </span>
  );
}

// Sliding Exam Board Carousel Component with logos and navigation
function ExamBoardCarousel() {
  const [isPaused, setIsPaused] = useState(false);
  
  // Duplicate the array for seamless infinite scroll
  const duplicatedBoards = [...examBoards, ...examBoards, ...examBoards];

  return (
    <div 
      className="relative overflow-hidden py-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Gradient overlays for fade effect */}
      <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />
      
      <div 
        className={cn(
          "flex gap-6 animate-scroll",
          isPaused && "pause-animation"
        )}
        style={{
          width: 'max-content',
        }}
      >
        {duplicatedBoards.map((board, index) => (
          <Link 
            key={`${board.id}-${index}`}
            href={`/subjects?exam_board=${board.id}`}
          >
            <Card 
              className="flex-shrink-0 w-72 h-[140px] bg-card hover:bg-muted/50 transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer border-2 hover:border-primary/50"
            >
              <CardContent className="p-5 h-full">
                <div className="flex items-start gap-4 h-full">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0",
                    board.color
                  )}>
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-bold text-foreground text-lg">{board.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{board.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {board.levels.slice(0, 2).map((level) => (
                        <span 
                          key={level}
                          className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground"
                        >
                          {level}
                        </span>
                      ))}
                      {board.levels.length > 2 && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          +{board.levels.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      
      {/* CSS for animation */}
      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-288px * 6 - 24px * 6));
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .pause-animation {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

const testimonials = [
    {
        quote: "This app has helped me a big deal. The interactive assessments are a game-changer for exam prep, not forgetting the Streaks!",
        name: "Aisha Khan",
        title: "A Level Student",
        avatar: "1"
    },
    {
        quote: "As a teacher, I can finally track my students' progress effectively. Highly recommended for all educators.",
        name: "David Mutale",
        title: "IGCSE Teacher",
        avatar: "2"
    }
];

export default function LandingPage() {
    return (
        <div className="bg-background text-foreground">
            {/* Hero Section with Rotating Text */}
            <section className="relative overflow-hidden pt-16 sm:pt-20 md:pt-32 pb-12 md:pb-24">
                <FloatingIconsBackground />
                <div className="container mx-auto px-4 text-center relative z-10">
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-4 leading-tight flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-3">
                        <span>High Quality Resources for</span>
                        <RotatingText />
                    </h1>
                    <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
                        Topical questions, past papers, and revision notes for IGCSE, GCSE & A Level.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4">
                        <Button asChild size="lg" className="shadow-lg w-full sm:w-auto">
                            <Link href="/signup">Get Started for Free</Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                            <Link href="/signup?plan=teacher">I'm a teacher</Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Exam Boards Carousel Section */}
            <section className="py-8 sm:py-12 bg-muted/30 border-y">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Supported Exam Boards</h2>
                        <p className="text-sm sm:text-base text-muted-foreground mt-2">All major exam boards supported</p>
                    </div>
                </div>
                <ExamBoardCarousel />
                <div className="container mx-auto px-4 text-center mt-4">
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                        <Link href="/subjects">Explore All Subjects</Link>
                    </Button>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-12 sm:py-16 md:py-20 bg-background">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">Why Choose Us?</h2>
                        <p className="text-base sm:text-lg text-muted-foreground mt-2">Everything you need in one place.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Interactive Quizzes</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Dynamic quizzes with instant feedback.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">For Students & Teachers</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Dedicated dashboards for students and teachers.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Expert Content</CardTitle>
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Syllabus-aligned content from expert educators.</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-xl hover:-translate-y-2 transition-transform duration-300">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Personalized Feedback</CardTitle>
                                <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Instant feedback on your performance.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-12 sm:py-16 md:py-20 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-8 sm:mb-12">
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground px-4">Loved by Students and Teachers Alike</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
                        {testimonials.map((testimonial, index) => (
                            <Card key={index} className="bg-background shadow-lg">
                                <CardContent className="pt-6 flex flex-col items-center text-center">
                                    <Image 
                                      src={`https://picsum.photos/seed/${testimonial.avatar}/100/100`} 
                                      alt={testimonial.name}
                                      width={60}
                                      height={60}
                                      className="rounded-full mb-3 sm:mb-4 sm:w-20 sm:h-20"
                                      data-ai-hint="portrait person"
                                    />
                                    <p className="text-sm sm:text-base text-muted-foreground italic mb-3 sm:mb-4">"{testimonial.quote}"</p>
                                    <div className="font-semibold text-foreground text-sm sm:text-base">{testimonial.name}</div>
                                    <div className="text-xs sm:text-sm text-primary font-medium">{testimonial.title}</div>
                                 </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-12 sm:py-16 md:py-20 bg-primary text-primary-foreground">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Ready to Get Started?</h2>
                    <p className="text-base sm:text-lg mb-6 sm:mb-8 opacity-90">Join thousands of students achieving top grades.</p>
                    <Button asChild size="lg" variant="secondary" className="shadow-lg w-full sm:w-auto">
                        <Link href="/signup">Sign Up Now</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
