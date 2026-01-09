'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface QuestionTextRendererProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Renders question text with proper formatting for:
 * - Mathematical notation (subscripts, superscripts)
 * - Chemical formulas
 * - Line breaks and paragraphs
 * - Lists and bullet points
 * - Special characters
 */
export function QuestionTextRenderer({ 
  text, 
  className,
  size = 'md' 
}: QuestionTextRendererProps) {
  if (!text) return null;

  // Process the text for display
  const processedText = processQuestionText(text);

  const sizeClasses = {
    sm: 'text-sm leading-relaxed',
    md: 'text-base leading-relaxed',
    lg: 'text-lg leading-relaxed'
  };

  return (
    <div 
      className={cn(
        'question-text prose prose-slate dark:prose-invert max-w-none',
        sizeClasses[size],
        className
      )}
      dangerouslySetInnerHTML={{ __html: processedText }}
    />
  );
}

/**
 * Process question text for proper HTML rendering
 */
function processQuestionText(text: string): string {
  if (!text) return '';

  let processed = text;

  // Escape HTML entities first (security)
  processed = escapeHtml(processed);

  // Convert subscripts: H_2O -> H<sub>2</sub>O, CO_2 -> CO<sub>2</sub>
  processed = processed.replace(/([A-Za-z])_(\d+)/g, '$1<sub>$2</sub>');
  processed = processed.replace(/([A-Za-z])₂/g, '$1<sub>2</sub>');
  processed = processed.replace(/([A-Za-z])₃/g, '$1<sub>3</sub>');
  processed = processed.replace(/([A-Za-z])₄/g, '$1<sub>4</sub>');

  // Convert superscripts: x^2 -> x<sup>2</sup>, 10^3 -> 10<sup>3</sup>
  processed = processed.replace(/(\w)\^(\d+)/g, '$1<sup>$2</sup>');
  processed = processed.replace(/(\w)²/g, '$1<sup>2</sup>');
  processed = processed.replace(/(\w)³/g, '$1<sup>3</sup>');

  // Handle common chemical formulas
  processed = formatChemicalFormulas(processed);

  // Convert line breaks to HTML
  processed = processed.replace(/\n\n+/g, '</p><p>');
  processed = processed.replace(/\n/g, '<br/>');

  // Wrap in paragraph if not already
  if (!processed.startsWith('<p>')) {
    processed = `<p>${processed}</p>`;
  }

  // Format lists (simple detection)
  processed = formatLists(processed);

  // Format bold text: **text** or __text__
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // Format italic text: *text* or _text_
  processed = processed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  processed = processed.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Format arrows
  processed = processed.replace(/-&gt;/g, '→');
  processed = processed.replace(/&lt;-/g, '←');
  processed = processed.replace(/&lt;-&gt;/g, '↔');
  processed = processed.replace(/=&gt;/g, '⇒');

  // Format mathematical symbols
  processed = processed.replace(/&lt;=/g, '≤');
  processed = processed.replace(/&gt;=/g, '≥');
  processed = processed.replace(/!=/g, '≠');
  processed = processed.replace(/\+-/g, '±');
  processed = processed.replace(/\.\.\./g, '…');

  return processed;
}

/**
 * Escape HTML entities for security
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

/**
 * Format common chemical formulas
 */
function formatChemicalFormulas(text: string): string {
  // Common chemical formulas with subscripts
  const formulas: Record<string, string> = {
    'H2O': 'H<sub>2</sub>O',
    'CO2': 'CO<sub>2</sub>',
    'O2': 'O<sub>2</sub>',
    'N2': 'N<sub>2</sub>',
    'H2': 'H<sub>2</sub>',
    'Cl2': 'Cl<sub>2</sub>',
    'Br2': 'Br<sub>2</sub>',
    'I2': 'I<sub>2</sub>',
    'H2SO4': 'H<sub>2</sub>SO<sub>4</sub>',
    'HCl': 'HCl',
    'NaOH': 'NaOH',
    'NaCl': 'NaCl',
    'CaCO3': 'CaCO<sub>3</sub>',
    'Ca(OH)2': 'Ca(OH)<sub>2</sub>',
    'NH3': 'NH<sub>3</sub>',
    'CH4': 'CH<sub>4</sub>',
    'C2H5OH': 'C<sub>2</sub>H<sub>5</sub>OH',
    'C6H12O6': 'C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>',
    'Fe2O3': 'Fe<sub>2</sub>O<sub>3</sub>',
    'MgO': 'MgO',
    'CuSO4': 'CuSO<sub>4</sub>',
    'KMnO4': 'KMnO<sub>4</sub>',
    'HNO3': 'HNO<sub>3</sub>',
    'H3PO4': 'H<sub>3</sub>PO<sub>4</sub>',
    'Na2CO3': 'Na<sub>2</sub>CO<sub>3</sub>',
    'CaCl2': 'CaCl<sub>2</sub>',
    'MgCl2': 'MgCl<sub>2</sub>',
    'AlCl3': 'AlCl<sub>3</sub>',
    'Al2O3': 'Al<sub>2</sub>O<sub>3</sub>',
    'SO2': 'SO<sub>2</sub>',
    'SO3': 'SO<sub>3</sub>',
    'NO2': 'NO<sub>2</sub>',
    'NO': 'NO',
    'C2H4': 'C<sub>2</sub>H<sub>4</sub>',
    'C2H2': 'C<sub>2</sub>H<sub>2</sub>',
    'C3H8': 'C<sub>3</sub>H<sub>8</sub>',
  };

  let result = text;
  for (const [formula, formatted] of Object.entries(formulas)) {
    // Use word boundaries to avoid partial matches
    const regex = new RegExp(`\\b${formula}\\b`, 'g');
    result = result.replace(regex, formatted);
  }

  return result;
}

/**
 * Format simple lists
 */
function formatLists(text: string): string {
  // Convert numbered lists: 1. item, 2. item
  text = text.replace(/<br\/>(\d+)\.\s+/g, '</li><li>');
  
  // Convert bullet lists: - item, • item, * item
  text = text.replace(/<br\/>[-•*]\s+/g, '</li><li>');

  // Wrap lists in ul/ol tags if needed
  if (text.includes('</li><li>')) {
    // Simple heuristic: if starts with number, use ol
    if (text.match(/<p>1\.\s/)) {
      text = text.replace(/<p>(\d+)\.\s+/, '<ol><li>');
      text = text.replace(/<\/li><\/p>/, '</li></ol>');
    } else {
      text = text.replace(/<p>[-•*]\s+/, '<ul><li>');
      text = text.replace(/<\/li><\/p>/, '</li></ul>');
    }
  }

  return text;
}

/**
 * Simple text display without HTML processing (for previews)
 */
export function QuestionTextPreview({ 
  text, 
  maxLength = 150,
  className 
}: { 
  text: string; 
  maxLength?: number;
  className?: string;
}) {
  if (!text) return null;

  const truncated = text.length > maxLength 
    ? text.slice(0, maxLength) + '...' 
    : text;

  return (
    <span className={cn('text-foreground', className)}>
      {truncated}
    </span>
  );
}

export default QuestionTextRenderer;
