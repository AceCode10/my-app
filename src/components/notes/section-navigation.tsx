'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NoteSection } from '@/types/notes';

interface SectionNavigationProps {
  sections: NoteSection[];
  currentSectionId?: string | null;
  completedSectionIds?: Set<string>;
  onSectionClick: (section: NoteSection) => void;
  className?: string;
  showProgress?: boolean;
}

export function SectionNavigation({
  sections,
  currentSectionId,
  completedSectionIds = new Set(),
  onSectionClick,
  className,
  showProgress = true
}: SectionNavigationProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleExpand = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const totalSections = countAllSections(sections);
  const completedCount = completedSectionIds.size;
  const progressPercentage = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Progress Header */}
      {showProgress && totalSections > 0 && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Your Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{totalSections} sections
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Sections List */}
      <ScrollArea className="flex-1">
        <nav className="p-2">
          <ul className="space-y-1">
            {sections.map((section) => (
              <SectionItem
                key={section.id}
                section={section}
                currentSectionId={currentSectionId}
                completedSectionIds={completedSectionIds}
                expandedSections={expandedSections}
                onSectionClick={onSectionClick}
                onToggleExpand={toggleExpand}
                depth={0}
              />
            ))}
          </ul>
        </nav>
      </ScrollArea>
    </div>
  );
}

interface SectionItemProps {
  section: NoteSection;
  currentSectionId?: string | null;
  completedSectionIds: Set<string>;
  expandedSections: Set<string>;
  onSectionClick: (section: NoteSection) => void;
  onToggleExpand: (sectionId: string) => void;
  depth: number;
}

function SectionItem({
  section,
  currentSectionId,
  completedSectionIds,
  expandedSections,
  onSectionClick,
  onToggleExpand,
  depth
}: SectionItemProps) {
  const hasChildren = section.children && section.children.length > 0;
  const isExpanded = expandedSections.has(section.id);
  const isCurrent = currentSectionId === section.id;
  const isCompleted = completedSectionIds.has(section.id);

  return (
    <li>
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors',
          'hover:bg-muted/50',
          isCurrent && 'bg-primary/10 text-primary font-medium',
          !isCurrent && isCompleted && 'text-muted-foreground'
        )}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSectionClick(section)}
      >
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(section.id);
            }}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Completion Status */}
        {isCompleted ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}

        {/* Section Title */}
        <span className="flex-1 truncate text-sm">{section.title}</span>

        {/* Reading Time */}
        {section.estimated_read_time && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {section.estimated_read_time}m
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul className="mt-1 space-y-1">
          {section.children!.map((child) => (
            <SectionItem
              key={child.id}
              section={child}
              currentSectionId={currentSectionId}
              completedSectionIds={completedSectionIds}
              expandedSections={expandedSections}
              onSectionClick={onSectionClick}
              onToggleExpand={onToggleExpand}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Helper to count all sections including nested
function countAllSections(sections: NoteSection[]): number {
  let count = 0;
  for (const section of sections) {
    count += 1;
    if (section.children) {
      count += countAllSections(section.children);
    }
  }
  return count;
}

// Mobile-friendly section selector
interface MobileSectionSelectorProps {
  sections: NoteSection[];
  currentSection?: NoteSection | null;
  onSectionChange: (section: NoteSection) => void;
}

export function MobileSectionSelector({
  sections,
  currentSection,
  onSectionChange
}: MobileSectionSelectorProps) {
  const flatSections = flattenSections(sections);
  const currentIndex = currentSection 
    ? flatSections.findIndex(s => s.id === currentSection.id) 
    : -1;

  const goToPrevious = () => {
    if (currentIndex > 0) {
      onSectionChange(flatSections[currentIndex - 1]);
    }
  };

  const goToNext = () => {
    if (currentIndex < flatSections.length - 1) {
      onSectionChange(flatSections[currentIndex + 1]);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-muted/30 border-t">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevious}
        disabled={currentIndex <= 0}
      >
        <ChevronRight className="h-4 w-4 rotate-180 mr-1" />
        Previous
      </Button>

      <div className="flex-1 text-center">
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {flatSections.length}
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNext}
        disabled={currentIndex >= flatSections.length - 1}
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

// Helper to flatten nested sections
function flattenSections(sections: NoteSection[]): NoteSection[] {
  const result: NoteSection[] = [];
  for (const section of sections) {
    result.push(section);
    if (section.children) {
      result.push(...flattenSections(section.children));
    }
  }
  return result;
}

export default SectionNavigation;
