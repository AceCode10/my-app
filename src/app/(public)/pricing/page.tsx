'use client';
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Check } from "lucide-react";
import { PricingSwitch } from '@/components/pricing-switch';

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);

  return (
    (<div className="bg-background text-foreground py-20">
      <div className="container mx-auto px-4">
        <div className="text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-foreground">Choose Your Plan</h1>
          <p className="mt-4 text-lg text-muted-foreground">Start for free, then upgrade for unlimited access and powerful features.</p>
        </div>
        
        <div className="mt-10 px-4 sm:px-6 lg:px-8">
          <PricingSwitch isYearly={isYearly} setIsYearly={setIsYearly} />
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3 max-w-5xl mx-auto">
          <div className={`pricing-card border rounded-2xl p-6 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl border-border bg-card`}>
              <h3 className="text-2xl font-bold text-card-foreground">Basic (Free)</h3>
              <p className="mt-2 text-muted-foreground h-10">For casual revision</p>
              <p className="mt-4 text-5xl font-extrabold text-card-foreground">$0</p>
              <Button asChild className={`mt-6 w-full bg-muted text-muted-foreground hover:bg-muted/80`}>
                  <Link href="/signup">Get Started</Link>
              </Button>
              <ul className="mt-6 space-y-3 text-muted-foreground text-sm">
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Notes & past papers</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>5 flashcards/week</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>1 topical assessment/week</span></li>
              </ul>
          </div>
          <div className={`pricing-card relative border-2 rounded-2xl p-6 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl border-primary bg-card`}>
              <p className="absolute top-0 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</p>
              <h3 className="text-2xl font-bold text-card-foreground">Essential</h3>
              <p className="mt-2 text-muted-foreground h-10">For dedicated students</p>
              <p className="mt-4 text-5xl font-extrabold text-card-foreground">{isYearly ? '$7.99' : '$9.99'}<span className="text-lg font-medium text-muted-foreground">/mo</span></p>
              <Button asChild className={`mt-6 w-full bg-primary hover:bg-primary/90 shadow-md text-primary-foreground`}>
                  <Link href="/signup?plan=essential">Start 7-Day Free Trial</Link>
              </Button>
              <ul className="mt-6 space-y-3 text-muted-foreground text-sm">
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Unlimited flashcards & topical assessments</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>10 AI explanation credits/day</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>XP, badges, streaks</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Join classes & assessments</span></li>
              </ul>
          </div>
          <div className={`pricing-card border rounded-2xl p-6 flex flex-col transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-2xl border-border bg-card`}>
              <h3 className="text-2xl font-bold text-card-foreground">Pro</h3>
              <p className="mt-2 text-muted-foreground h-10">For high achievers</p>
              <p className="mt-4 text-5xl font-extrabold text-card-foreground">{isYearly ? '$19.99' : '$24.99'}<span className="text-lg font-medium text-muted-foreground">/mo</span></p>
                  <Button asChild className={`mt-6 w-full bg-accent text-accent-foreground hover:bg-accent/90`}>
                  <Link href="/signup?plan=pro">Start 7-Day Free Trial</Link>
              </Button>
              <ul className="mt-6 space-y-3 text-muted-foreground text-sm">
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>All Essential features +</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Unlimited AI explanations</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Timed full paper assessments</span></li>
                      <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Mistake tracker</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Model answers unlocked</span></li>
                  <li className="flex items-center space-x-2"><Check className="w-5 h-5 text-green-500" /><span>Priority support</span></li>
              </ul>
          </div>
        </div>
      </div>
    </div>)
  );
};

export default PricingPage;
