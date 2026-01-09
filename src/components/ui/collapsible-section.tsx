'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'card' | 'ghost';
  badge?: React.ReactNode;
  action?: React.ReactNode;
  storageKey?: string;
}

export function CollapsibleSection({
  title,
  description,
  icon,
  defaultOpen = true,
  children,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
  badge,
  action,
  storageKey,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`collapsible-${storageKey}`);
      return stored !== null ? stored === 'true' : defaultOpen;
    }
    return defaultOpen;
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`collapsible-${storageKey}`, String(open));
    }
  };

  const triggerContent = (
    <div className={cn(
      "flex items-center justify-between w-full",
      headerClassName
    )}>
      <div className="flex items-center gap-2">
        {icon}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{title}</span>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {action}
        <div className={cn(
          "transition-transform duration-200",
          isOpen && "rotate-180"
        )}>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );

  if (variant === 'card') {
    return (
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={className}>
        <Card>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                {triggerContent}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className={contentClassName}>
              {children}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  if (variant === 'ghost') {
    return (
      <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={className}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-between px-3 py-2 h-auto hover:bg-muted/50",
              headerClassName
            )}
          >
            {triggerContent}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn("pt-2", contentClassName)}>
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange} className={className}>
      <div className={cn(
        "border rounded-lg",
        className
      )}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-between px-4 py-3 h-auto rounded-lg hover:bg-muted/50",
              !isOpen && "rounded-b-lg",
              isOpen && "rounded-b-none border-b",
              headerClassName
            )}
          >
            {triggerContent}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn("px-4 py-3", contentClassName)}>
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

interface CollapsibleCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  storageKey?: string;
}

export function CollapsibleCard({
  title,
  description,
  icon,
  defaultOpen = true,
  children,
  className,
  badge,
  action,
  storageKey,
}: CollapsibleCardProps) {
  return (
    <CollapsibleSection
      title={title}
      description={description}
      icon={icon}
      defaultOpen={defaultOpen}
      variant="card"
      className={className}
      badge={badge}
      action={action}
      storageKey={storageKey}
    >
      {children}
    </CollapsibleSection>
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
