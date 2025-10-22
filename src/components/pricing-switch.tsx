"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingSwitchProps {
  isYearly: boolean;
  setIsYearly: (value: boolean) => void;
}

export function PricingSwitch({ isYearly, setIsYearly }: PricingSwitchProps) {
  return (
    <div className="flex justify-center">
      <div className="bg-muted p-1 rounded-full flex gap-1 items-center">
        <button
          onClick={() => setIsYearly(true)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
            isYearly
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Yearly
           <Badge variant="default" className="bg-green-100 text-green-700">
            Save 20%
          </Badge>
        </button>
        <button
          onClick={() => setIsYearly(false)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative",
            !isYearly
              ? "bg-card text-card-foreground shadow-sm"
              : "text-muted-foreground"
          )}
        >
          Monthly
        </button>
      </div>
    </div>
  );
}
