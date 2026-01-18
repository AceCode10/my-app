'use client';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check, Sparkles, Zap, Crown, BookOpen, Brain, Target, Trophy, Clock, Users } from "lucide-react";
import { PricingSwitch } from '@/components/pricing-switch';
import { Badge } from "@/components/ui/badge";

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <div className="bg-background text-foreground py-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Sparkles className="w-3 h-3 mr-1" />
            Trusted by 10,000+ IGCSE Students
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold text-foreground">
            Ace Your Exams with <span className="text-primary">IGA Prep</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Unlimited access to past papers, topical questions, and revision notes.
          </p>
        </div>
        
        {/* Billing Toggle */}
        <div className="mb-10">
          <PricingSwitch isYearly={isYearly} setIsYearly={setIsYearly} />
          {isYearly && (
            <p className="text-center text-sm text-green-600 font-medium mt-2">
              Save up to 20% with yearly billing
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 lg:grid-cols-3 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="pricing-card border rounded-2xl p-8 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-xl border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6 text-muted-foreground" />
              <h3 className="text-2xl font-bold text-card-foreground">Free</h3>
            </div>
            <p className="text-muted-foreground mb-6">Start learning for free</p>
            <p className="text-5xl font-extrabold text-card-foreground mb-6">$0<span className="text-lg font-medium text-muted-foreground">/forever</span></p>
            <Button asChild variant="outline" className="w-full mb-8">
              <Link href="/signup">Start Free</Link>
            </Button>
            <ul className="space-y-4 text-sm flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Unlimited</strong> revision notes access</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Unlimited</strong> past paper downloads</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>3</strong> topical question sets per week</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span>Basic progress tracking</span>
              </li>
            </ul>
          </div>

          {/* Essential Plan - Most Popular */}
          <div className="pricing-card relative border-2 rounded-2xl p-8 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl border-primary bg-card scale-105">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm font-bold shadow-lg">
                <Zap className="w-3 h-3 mr-1" />
                MOST POPULAR
              </Badge>
            </div>
            <div className="flex items-center gap-2 mb-2 mt-2">
              <Brain className="w-6 h-6 text-primary" />
              <h3 className="text-2xl font-bold text-card-foreground">Essential</h3>
            </div>
            <p className="text-muted-foreground mb-6">Most popular choice</p>
            <p className="text-5xl font-extrabold text-card-foreground mb-2">
              {isYearly ? '$7.99' : '$9.99'}
              <span className="text-lg font-medium text-muted-foreground">/mo</span>
            </p>
            {isYearly && <p className="text-sm text-green-600 mb-4">Billed as $95.88/year</p>}
            <Button asChild className="w-full mb-8 bg-primary hover:bg-primary/90 shadow-lg">
              <Link href="/signup?plan=essential">
                <Sparkles className="w-4 h-4 mr-2" />
                Start 7-Day Free Trial
              </Link>
            </Button>
            <ul className="space-y-4 text-sm flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Everything in Free</strong>, plus:</span>
              </li>
              <li className="flex items-start gap-3">
                <Target className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>Unlimited</strong> topical questions with instant feedback</span>
              </li>
              <li className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span><strong>20 AI explanations</strong> per day for difficult questions</span>
              </li>
              <li className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>XP, badges, streaks & leaderboards</span>
              </li>
              <li className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Join classes & teacher-assigned assessments</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>Detailed performance analytics</span>
              </li>
            </ul>
          </div>

          {/* Pro Plan */}
          <div className="pricing-card border rounded-2xl p-8 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-xl border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-6 h-6 text-amber-500" />
              <h3 className="text-2xl font-bold text-card-foreground">Pro</h3>
            </div>
            <p className="text-muted-foreground mb-6">Maximum features</p>
            <p className="text-5xl font-extrabold text-card-foreground mb-2">
              {isYearly ? '$14.99' : '$19.99'}
              <span className="text-lg font-medium text-muted-foreground">/mo</span>
            </p>
            {isYearly && <p className="text-sm text-green-600 mb-4">Billed as $179.88/year</p>}
            <Button asChild className="w-full mb-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
              <Link href="/signup?plan=pro">
                <Crown className="w-4 h-4 mr-2" />
                Start 7-Day Free Trial
              </Link>
            </Button>
            <ul className="space-y-4 text-sm flex-grow">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <span><strong>Everything in Essential</strong>, plus:</span>
              </li>
              <li className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span><strong>Unlimited</strong> AI explanations</span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>Timed full paper practice mode</span>
              </li>
              <li className="flex items-start gap-3">
                <Target className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>Mistake tracker & weak topic analysis</span>
              </li>
              <li className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>Model answers & examiner tips unlocked</span>
              </li>
              <li className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>Priority support & early access to features</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust Section */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">Trusted by students preparing for</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Badge variant="outline" className="text-sm py-1.5 px-4">Cambridge IGCSE</Badge>
            <Badge variant="outline" className="text-sm py-1.5 px-4">Edexcel IGCSE</Badge>
            <Badge variant="outline" className="text-sm py-1.5 px-4">Cambridge A-Level</Badge>
            <Badge variant="outline" className="text-sm py-1.5 px-4">IB Diploma</Badge>
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Have questions? <Link href="/faq" className="text-primary hover:underline font-medium">Check our FAQ</Link> or <Link href="/contact" className="text-primary hover:underline font-medium">contact us</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
