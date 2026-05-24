'use client';

import { ReactNode, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Title shown at the top of the dialog */
  title?: string;
  /** Description body */
  description?: ReactNode;
  /** Optional confirmation phrase the user must type to enable the destructive button */
  requireText?: string;
  /** Optional label for the destructive button */
  confirmLabel?: string;
  /** True while the parent mutation is running */
  loading?: boolean;
  /** Called when user clicks confirm */
  onConfirm: () => void | Promise<void>;
}

/**
 * Shared destructive-action confirmation dialog.
 *
 * Replaces the inline `AlertDialog` + state-juggling pattern that admin pages
 * (users, questions, papers, notes) each rolled by hand. Supports an optional
 * typed-confirmation step for irreversible deletes.
 */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  description,
  requireText,
  confirmLabel = 'Delete',
  loading = false,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState('');

  // Reset typed-confirmation when dialog opens/closes.
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  const matchesGate = !requireText || typed === requireText;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {requireText && (
          <div className="space-y-2">
            <Label htmlFor="confirm-delete-text" className="text-sm">
              Type <span className="font-mono font-semibold">{requireText}</span> to confirm.
            </Label>
            <Input
              id="confirm-delete-text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading || !matchesGate}
            onClick={e => {
              e.preventDefault();
              void onConfirm();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDeleteDialog;
