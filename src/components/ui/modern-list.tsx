'use client';

import React from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Progress Ring Component - Circular progress indicator like Tutopiya
interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 3,
  className 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const getColor = () => {
    if (progress === 0) return 'text-muted-foreground/30';
    if (progress < 30) return 'text-orange-500';
    if (progress < 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={cn("transition-all duration-500", getColor())}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold text-foreground">
        {progress}%
      </span>
    </div>
  );
}

// Modern List Item - Clean expandable row like Tutopiya
interface ModernListItemProps {
  title: string;
  subtitle?: string;
  code?: string;
  icon?: React.ReactNode;
  progress?: number;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  expandable?: boolean;
  defaultExpanded?: boolean;
  className?: string;
  rightContent?: React.ReactNode;
}

export function ModernListItem({
  title,
  subtitle,
  code,
  icon,
  progress,
  badge,
  children,
  href,
  onClick,
  expandable = false,
  defaultExpanded = false,
  className,
  rightContent,
}: ModernListItemProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  
  const hasContent = !!children;
  const isExpandable = expandable && hasContent;
  
  const handleClick = () => {
    if (isExpandable) {
      setIsExpanded(!isExpanded);
    }
    onClick?.();
  };

  const content = (
    <>
      <div 
        className={cn(
          "flex items-center gap-4 p-4 transition-colors",
          (isExpandable || onClick || href) && "cursor-pointer hover:bg-muted/50",
          className
        )}
        onClick={!href ? handleClick : undefined}
      >
        {/* Progress ring or icon */}
        {progress !== undefined ? (
          <ProgressRing progress={progress} size={44} />
        ) : icon ? (
          <div className="flex-shrink-0 w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        ) : null}
        
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate">{title}</h3>
            {code && (
              <span className="text-sm text-muted-foreground font-medium">{code}</span>
            )}
            {badge}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        
        {/* Right content or chevron */}
        {rightContent ? (
          rightContent
        ) : isExpandable ? (
          <ChevronDown 
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform duration-200",
              isExpanded && "rotate-180"
            )} 
          />
        ) : (href || onClick) ? (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        ) : null}
      </div>
      
      {/* Expandable content */}
      {isExpandable && isExpanded && (
        <div className="border-t bg-muted/20 px-4 py-3">
          {children}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <a href={href} className="block">
        {content}
      </a>
    );
  }

  return content;
}

// Modern List Container
interface ModernListProps {
  children: React.ReactNode;
  className?: string;
}

export function ModernList({ children, className }: ModernListProps) {
  return (
    <div className={cn(
      "bg-card rounded-xl border divide-y overflow-hidden",
      className
    )}>
      {children}
    </div>
  );
}

// Action Card - For quick actions like Videos, Resources, etc.
interface ActionCardProps {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'secondary' | 'outline';
  badge?: string;
  className?: string;
}

export function ActionCard({
  title,
  icon,
  href,
  onClick,
  variant = 'default',
  badge,
  className,
}: ActionCardProps) {
  const variants = {
    default: 'bg-card border hover:border-primary hover:bg-muted/50',
    primary: 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20',
    secondary: 'bg-muted/50 border hover:bg-muted',
    outline: 'bg-transparent border-2 hover:bg-muted/50',
  };

  const content = (
    <div className={cn(
      "relative flex items-center justify-between p-4 rounded-xl transition-all cursor-pointer",
      variants[variant],
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="text-current">{icon}</div>
        <span className="font-medium">{title}</span>
      </div>
      {badge && (
        <span className="absolute top-2 right-2 text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  );

  if (href) {
    return <a href={href}>{content}</a>;
  }

  return <div onClick={onClick}>{content}</div>;
}

// Year Column for Past Papers (like Tutopiya)
interface YearColumnProps {
  year: number;
  children: React.ReactNode;
  className?: string;
}

export function YearColumn({ year, children, className }: YearColumnProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <div className="bg-primary text-primary-foreground font-bold text-center py-2 rounded-t-lg">
        {year}
      </div>
      <div className="flex-1 border border-t-0 rounded-b-lg p-3 space-y-2 bg-card">
        {children}
      </div>
    </div>
  );
}

// Paper Link Item
interface PaperLinkProps {
  title: string;
  href: string;
  icon?: React.ReactNode;
  className?: string;
}

export function PaperLink({ title, href, icon, className }: PaperLinkProps) {
  return (
    <a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center justify-between py-2 px-1 text-sm hover:text-primary transition-colors",
        className
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </a>
  );
}

// Stats Badge - Compact stat display
interface StatBadgeProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatBadge({ value, label, icon, className }: StatBadgeProps) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-full text-xs",
      className
    )}>
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}
