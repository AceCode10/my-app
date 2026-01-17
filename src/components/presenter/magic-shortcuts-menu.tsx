'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MagicShortcut {
  id: string;
  name: string;
  icon: string;
  key: string;
  color?: string;
}

const shortcuts: MagicShortcut[] = [
  { id: 'blur', name: 'Blur', icon: '🌫️', key: 'B' },
  { id: 'quiet', name: 'Quiet', icon: '🤫', key: 'Q', color: 'text-yellow-400' },
  { id: 'bubbles', name: 'Bubbles', icon: '🫧', key: 'O', color: 'text-cyan-400' },
  { id: 'confetti', name: 'Confetti', icon: '🎊', key: 'C', color: 'text-pink-400' },
  { id: 'drumroll', name: 'Drumroll', icon: '🥁', key: 'D', color: 'text-orange-400' },
  { id: 'curtain', name: 'Curtain call', icon: '🎭', key: 'U', color: 'text-red-400' },
  { id: 'micdrop', name: 'Mic drop', icon: '🎤', key: 'M', color: 'text-purple-400' },
  { id: 'clear', name: 'Clear', icon: '↩', key: 'X' },
];

interface MagicShortcutsMenuProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function MagicShortcutsMenu({ onSelect, onClose }: MagicShortcutsMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Menu */}
      <div className="absolute bottom-full right-0 mb-2 z-50 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-700 flex items-center gap-2">
          <span className="text-lg">✨</span>
          <span className="text-white text-sm font-medium">Magic Shortcuts</span>
        </div>
        
        <div className="py-1">
          {shortcuts.map((shortcut) => (
            <button
              key={shortcut.id}
              onClick={() => onSelect(shortcut.id)}
              className="w-full px-3 py-2 flex items-center justify-between hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={cn('text-lg', shortcut.color)}>
                  {shortcut.icon}
                </span>
                <span className="text-white text-sm">{shortcut.name}</span>
              </div>
              <kbd className="px-2 py-0.5 text-xs text-gray-400 bg-gray-900 rounded">
                {shortcut.key}
              </kbd>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
