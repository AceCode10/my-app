'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkAction {
  /** Stable key */
  id: string;
  /** Button label */
  label: string;
  /** Optional icon element */
  icon?: ReactNode;
  /** Variant — destructive shows red */
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
  /** Async handler. Receives the selected ids and should resolve when work is done. */
  onClick: () => void | Promise<void>;
  /** Disable while another action runs */
  disabled?: boolean;
}

interface BulkActionsBarProps {
  selectedCount: number;
  actions: BulkAction[];
  /** Clear selection callback */
  onClear: () => void;
  /** Optional descriptor like "papers" / "approvals" — appears in the count text */
  itemNoun?: string;
  className?: string;
}

/**
 * Floating bottom bar shown while one or more rows are selected.
 * Drop into any admin list page that has row checkboxes.
 *
 * Render nothing when selectedCount = 0 so the page is clean.
 */
export function BulkActionsBar({
  selectedCount,
  actions,
  onClear,
  itemNoun = 'items',
  className,
}: BulkActionsBarProps) {
  if (selectedCount <= 0) return null;

  return (
    <div
      className={cn(
        'sticky bottom-4 z-40 mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border bg-card/95 px-4 py-2 shadow-lg backdrop-blur',
        className
      )}
      role="region"
      aria-label="Bulk actions"
    >
      <span className="text-sm font-medium">
        {selectedCount} {itemNoun} selected
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {actions.map(action => (
          <Button
            key={action.id}
            size="sm"
            variant={action.variant ?? 'secondary'}
            onClick={() => void action.onClick()}
            disabled={action.disabled}
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onClear}
        aria-label="Clear selection"
        className="ml-1 h-7 w-7"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default BulkActionsBar;
