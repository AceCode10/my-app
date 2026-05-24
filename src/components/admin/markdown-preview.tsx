'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  /** Raw markdown / LaTeX source */
  content: string;
  /** Optional class for outer wrapper */
  className?: string;
  /** Show a muted placeholder when content is empty */
  emptyText?: string;
}

/**
 * Renders question/note bodies with Markdown + LaTeX (KaTeX) + GitHub-flavoured Markdown.
 *
 * All packages here are already declared deps:
 *  - react-markdown
 *  - remark-math
 *  - rehype-katex
 *  - katex
 *  - remark-gfm
 *
 * Use on the admin question editor's right pane and anywhere a markdown stem
 * should display as it will to students.
 */
export function MarkdownPreview({ content, className, emptyText = 'Nothing to preview yet.' }: MarkdownPreviewProps) {
  if (!content?.trim()) {
    return (
      <div
        className={cn(
          'rounded-md border border-dashed bg-muted/30 px-3 py-2 text-sm text-muted-foreground',
          className
        )}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-sm dark:prose-invert max-w-none rounded-md border bg-card p-3',
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default MarkdownPreview;
