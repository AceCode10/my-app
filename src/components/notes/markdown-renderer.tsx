'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';

// Extend sanitize schema to allow KaTeX elements
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'mfrac',
    'mroot',
    'msqrt',
    'mtable',
    'mtr',
    'mtd',
    'mtext',
    'annotation',
    'span',
    'div'
  ],
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class', 'style'],
    span: [...(defaultSchema.attributes?.span || []), 'aria-hidden'],
    math: ['xmlns', 'display'],
    annotation: ['encoding']
  }
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  hasLatex?: boolean;
}

export function MarkdownRenderer({ content, className, hasLatex = false }: MarkdownRendererProps) {
  const remarkPlugins = useMemo(() => {
    const plugins: any[] = [remarkGfm];
    if (hasLatex) {
      plugins.push(remarkMath);
    }
    return plugins;
  }, [hasLatex]);

  const rehypePlugins = useMemo(() => {
    const plugins: any[] = [
      rehypeRaw,
      [rehypeSanitize, sanitizeSchema],
      rehypeHighlight
    ];
    if (hasLatex) {
      plugins.unshift(rehypeKatex);
    }
    return plugins;
  }, [hasLatex]);

  return (
    <div className={cn(
      'prose prose-slate dark:prose-invert max-w-none',
      // Headings - clear hierarchy with proper spacing
      'prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20',
      'prose-h1:text-2xl prose-h1:sm:text-3xl prose-h1:border-b prose-h1:border-border prose-h1:pb-3 prose-h1:mb-6 prose-h1:mt-0',
      'prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-primary/90 prose-h2:border-l-4 prose-h2:border-primary prose-h2:pl-4',
      'prose-h3:text-lg prose-h3:sm:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:font-semibold',
      'prose-h4:text-base prose-h4:sm:text-lg prose-h4:mt-6 prose-h4:mb-2 prose-h4:font-semibold',
      // Paragraphs - optimal reading experience
      'prose-p:text-base prose-p:leading-relaxed prose-p:mb-4 prose-p:text-foreground/90',
      // Lists - well-spaced and readable
      'prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6',
      'prose-li:my-2 prose-li:leading-relaxed',
      'prose-ul:list-disc prose-ol:list-decimal',
      // Code - clear distinction
      'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
      'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:overflow-x-auto',
      // Blockquotes - highlight important info
      'prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic prose-blockquote:text-foreground/80',
      // Tables - clean and readable
      'prose-table:border prose-table:border-border prose-table:rounded-lg prose-table:overflow-hidden',
      'prose-th:bg-muted prose-th:px-4 prose-th:py-3 prose-th:border prose-th:border-border prose-th:font-semibold prose-th:text-left',
      'prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-border',
      // Images
      'prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto',
      // Links
      'prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline',
      // Strong/Bold - emphasis
      'prose-strong:text-foreground prose-strong:font-bold',
      // HR - section divider
      'prose-hr:border-border prose-hr:my-8',
      className
    )}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        components={{
          // Custom heading with anchor links
          h1: ({ node, children, ...props }) => (
            <h1 id={generateId(children)} {...props}>
              {children}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2 id={generateId(children)} {...props}>
              {children}
            </h2>
          ),
          h3: ({ node, children, ...props }) => (
            <h3 id={generateId(children)} {...props}>
              {children}
            </h3>
          ),
          // Custom table wrapper for horizontal scroll on mobile
          table: ({ node, children, ...props }) => (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
              <table {...props}>{children}</table>
            </div>
          ),
          // Custom image with lazy loading
          img: ({ node, src, alt, ...props }) => (
            <img
              src={src}
              alt={alt || ''}
              loading="lazy"
              className="max-w-full h-auto"
              {...props}
            />
          ),
          // Custom code block
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn(className, 'block overflow-x-auto')} {...props}>
                {children}
              </code>
            );
          },
          // Custom blockquote with icon
          blockquote: ({ node, children, ...props }) => (
            <blockquote className="relative" {...props}>
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full" />
              {children}
            </blockquote>
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Helper to generate heading IDs for anchor links
function generateId(children: React.ReactNode): string {
  const text = React.Children.toArray(children)
    .map(child => {
      if (typeof child === 'string') return child;
      if (React.isValidElement(child) && child.props.children) {
        return generateId(child.props.children);
      }
      return '';
    })
    .join('');
  
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default MarkdownRenderer;
