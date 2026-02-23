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
import { Info, Lightbulb, AlertTriangle, BookOpen, PenLine } from 'lucide-react';

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
    'div',
    'figure',
    'figcaption',
    'mark',
    'center'
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

// Callout type definition
interface CalloutInfo {
  type: 'exam-tip' | 'definition' | 'warning' | 'info' | 'worked-example';
  icon: React.ReactNode;
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconBg: string;
  isWorkedExample?: boolean;
}

// Detect callout type from blockquote content
function getCalloutType(children: React.ReactNode): CalloutInfo | null {
  const text = extractText(children);
  
  if (text.startsWith('Worked Example') || text.startsWith('**Worked Example')) {
    return {
      type: 'worked-example',
      icon: <PenLine className="h-5 w-5 flex-shrink-0 text-white" />,
      label: 'Worked Example',
      borderColor: 'border-emerald-500',
      bgColor: 'bg-white dark:bg-slate-900',
      textColor: 'text-slate-800 dark:text-slate-200',
      iconBg: 'bg-emerald-500',
      isWorkedExample: true,
    };
  }
  if (text.startsWith('Exam Tip:') || text.startsWith('**Exam Tip:**')) {
    return {
      type: 'exam-tip',
      icon: <Lightbulb className="h-5 w-5 flex-shrink-0" />,
      label: 'Exam Tip',
      borderColor: 'border-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-900 dark:text-amber-100',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    };
  }
  if (text.startsWith('Key Definition:') || text.startsWith('**Key Definition:**')) {
    return {
      type: 'definition',
      icon: <BookOpen className="h-5 w-5 flex-shrink-0" />,
      label: 'Key Definition',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-900 dark:text-blue-100',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    };
  }
  if (text.startsWith('Common Mistake:') || text.startsWith('**Common Mistake:**') || text.startsWith('Warning:') || text.startsWith('**Warning:**')) {
    return {
      type: 'warning',
      icon: <AlertTriangle className="h-5 w-5 flex-shrink-0" />,
      label: 'Common Mistake',
      borderColor: 'border-red-500',
      bgColor: 'bg-red-50 dark:bg-red-950/30',
      textColor: 'text-red-900 dark:text-red-100',
      iconBg: 'bg-red-100 dark:bg-red-900/50',
    };
  }
  if (text.startsWith('Note:') || text.startsWith('**Note:**') || text.startsWith('Info:') || text.startsWith('**Info:**')) {
    return {
      type: 'info',
      icon: <Info className="h-5 w-5 flex-shrink-0" />,
      label: 'Note',
      borderColor: 'border-violet-500',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      textColor: 'text-violet-900 dark:text-violet-100',
      iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    };
  }
  return null;
}

function extractText(children: React.ReactNode): string {
  return React.Children.toArray(children)
    .map((child) => {
      if (typeof child === 'string') return child;
      if (React.isValidElement(child)) {
        const props = child.props as { children?: React.ReactNode };
        if (props.children) return extractText(props.children);
      }
      return '';
    })
    .join('')
    .trim();
}

// Worked Example content renderer - splits content into question/marks/answer
function WorkedExampleContent({ children }: { children: React.ReactNode }) {
  const childArray = React.Children.toArray(children);
  let inAnswer = false;
  const questionParts: React.ReactNode[] = [];
  const answerParts: React.ReactNode[] = [];
  let marksText: string | null = null;

  for (const child of childArray) {
    const text = extractText(child);

    // Skip the "Worked Example" title line (already rendered as header)
    if (text.startsWith('Worked Example') || text.startsWith('**Worked Example')) continue;

    // Detect marks notation like [2] or [3 marks]
    const marksMatch = text.match(/\[(\d+)(?:\s*marks?)?\]/);
    if (marksMatch && !inAnswer) {
      marksText = marksMatch[0];
    }

    // Detect "Answer" heading
    if (text.trim() === 'Answer' || text.trim() === '**Answer**' || text.startsWith('Answer')) {
      inAnswer = true;
      continue;
    }

    if (inAnswer) {
      answerParts.push(child);
    } else {
      questionParts.push(child);
    }
  }

  return (
    <div>
      {/* Question */}
      <div className="mb-4">
        {questionParts.length > 0 && (
          <div className="[&>p]:mb-2 [&>p:last-child]:mb-0">
            {questionParts}
          </div>
        )}
        {marksText && (
          <div className="text-right mt-2">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">{marksText}</span>
          </div>
        )}
      </div>

      {/* Answer section */}
      {answerParts.length > 0 && (
        <div className="mt-4">
          <h5 className="text-base font-bold text-foreground mb-3">Answer</h5>
          <div className="text-emerald-700 dark:text-emerald-400 [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:font-bold">
            {answerParts}
          </div>
        </div>
      )}
    </div>
  );
}

// Preprocess markdown to fix common authoring issues
function preprocessMarkdown(md: string): string {
  if (!md) return '';
  let result = md;
  // Fix bold markers with internal spaces: "** text **" → "**text**"
  // Also handle word-adjacent cases: "in** RAM **" → "in **RAM**"
  result = result.replace(/(\S?)\*\*\s+(.+?)\s+\*\*(\S?)/g, (_, before, content, after) => {
    const prefix = before && /\w/.test(before) ? before + ' ' : (before || '');
    const suffix = after && /\w/.test(after) ? ' ' + after : (after || '');
    return `${prefix}**${content}**${suffix}`;
  });
  // Fix italic markers with internal spaces: "* text *" → "*text*"  
  // Be careful not to match list items (line-start asterisk + space)
  result = result.replace(/(?<!\n|\*)\*\s+(.+?)\s+\*(?!\*)/g, '*$1*');
  return result;
}

export function MarkdownRenderer({ content, className, hasLatex = false }: MarkdownRendererProps) {
  const processedContent = useMemo(() => preprocessMarkdown(content), [content]);

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
      // Headings - SaveMyExams style: clear hierarchy, bold, well-spaced
      'prose-headings:font-bold prose-headings:text-foreground prose-headings:scroll-mt-20',
      'prose-h1:text-3xl prose-h1:sm:text-4xl prose-h1:mb-6 prose-h1:mt-0 prose-h1:leading-tight',
      'prose-h2:text-xl prose-h2:sm:text-2xl prose-h2:mt-10 prose-h2:mb-5 prose-h2:font-bold',
      'prose-h3:text-lg prose-h3:sm:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-h3:font-semibold',
      'prose-h4:text-base prose-h4:sm:text-lg prose-h4:mt-6 prose-h4:mb-3 prose-h4:font-semibold',
      // Paragraphs - 1.5pt line spacing
      'prose-p:text-base prose-p:leading-relaxed prose-p:mb-4 prose-p:text-foreground/90',
      // Lists - well-spaced like SaveMyExams/ZNotes
      'prose-ul:my-4 prose-ul:pl-6 prose-ol:my-4 prose-ol:pl-6',
      'prose-li:my-1.5 prose-li:leading-relaxed',
      '[&_ul]:list-disc [&_ol]:list-decimal',
      // Code
      'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:before:content-none prose-code:after:content-none',
      'prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg prose-pre:overflow-x-auto',
      // Tables - handled via custom component below
      'prose-table:w-full prose-table:my-6',
      // Images - centered with shadow
      'prose-img:rounded-lg prose-img:shadow-md prose-img:mx-auto prose-img:my-2',
      // Links
      'prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline',
      // Strong/Bold - prominent like SaveMyExams
      'prose-strong:text-foreground prose-strong:font-bold',
      // HR
      'prose-hr:border-border prose-hr:my-10',
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
          // Custom table with clear borders and shaded header
          table: ({ node, children, ...props }) => (
            <div className="not-prose overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 my-6">
              <table
                className="w-full text-sm [border:1px_solid_#cbd5e1] dark:[border:1px_solid_#475569]"
                style={{ borderCollapse: 'collapse' }}
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ node, children, ...props }: any) => (
            <thead className="bg-slate-100 dark:bg-slate-800" {...(props as any)}>{children}</thead>
          ),
          th: ({ node, children, ...props }: any) => (
            <th
              className="px-4 py-3 font-semibold text-left text-foreground [border:1px_solid_#cbd5e1] dark:[border:1px_solid_#475569]"
              {...(props as any)}
            >
              {children}
            </th>
          ),
          td: ({ node, children, ...props }: any) => (
            <td
              className="px-4 py-3 text-left text-foreground/90 [border:1px_solid_#cbd5e1] dark:[border:1px_solid_#475569]"
              {...(props as any)}
            >
              {children}
            </td>
          ),
          // Keyword emphasis: emerald green (dark) / bold black (light)
          mark: ({ node, children, ...props }: any) => (
            <span
              className="font-semibold text-black dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-900/40 px-1 py-0.5 rounded-sm"
              {...(props as any)}
            >
              {children}
            </span>
          ),
          // Center tag support for centered headings/content
          center: ({ node, children, ...props }: any) => (
            <div className="text-center" {...(props as any)}>
              {children}
            </div>
          ),
          // Unordered list with round bullets
          ul: ({ node, children, ordered, ...props }: any) => (
            <ul className="my-4 pl-6" style={{ listStyleType: 'disc' }} {...(props as any)}>
              {children}
            </ul>
          ),
          // Ordered list
          ol: ({ node, children, ordered, ...props }: any) => (
            <ol className="my-4 pl-6" style={{ listStyleType: 'decimal' }} {...(props as any)}>
              {children}
            </ol>
          ),
          // List item with proper spacing
          li: ({ node, children, ordered, ...props }: any) => (
            <li className="my-1.5 leading-relaxed" style={{ display: 'list-item' }} {...(props as any)}>
              {children}
            </li>
          ),
          // Custom image - use span wrapper to avoid <figure> inside <p> hydration error
          img: ({ node, src, alt, ...props }) => (
            <span className="block my-6 text-center not-prose">
              <img
                src={src}
                alt={alt || ''}
                loading="lazy"
                className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                {...props}
              />
            </span>
          ),
          // Italic paragraph after image = figure caption
          em: ({ node, children, ...props }) => {
            const text = extractText(children);
            // Check if this is a standalone caption (starts with Figure or is right after an image)
            if (text.startsWith('Figure ') || text.startsWith('Caption:')) {
              return (
                <span className="block text-center text-sm text-muted-foreground mt-[-0.5rem] mb-4" {...props}>
                  {children}
                </span>
              );
            }
            return <em {...props}>{children}</em>;
          },
          // Custom code block
          code: ({ node, inline, className: codeClassName, children, ...props }: any) => {
            if (inline) {
              return (
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className={cn(codeClassName, 'block overflow-x-auto')} {...props}>
                {children}
              </code>
            );
          },
          // Smart blockquote: detect callout type or render default
          blockquote: ({ node, children, ...props }) => {
            const callout = getCalloutType(children);

            if (callout) {
              // Special Worked Example rendering (SaveMyExams style)
              if (callout.isWorkedExample) {
                return (
                  <div className={cn(
                    'not-prose my-8 border-l-4 rounded-r-xl overflow-hidden shadow-sm',
                    callout.borderColor,
                    callout.bgColor
                  )}>
                    {/* Header with icon badge */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', callout.iconBg)}>
                          {callout.icon}
                        </div>
                        <h4 className="text-xl font-bold text-foreground">Worked Example</h4>
                      </div>
                      {/* Content: question, marks, answer rendered with special styling */}
                      <div className={cn(
                        'text-base leading-relaxed',
                        callout.textColor,
                        // Style "Answer" heading
                        '[&>p]:mb-3 [&>p:last-child]:mb-0',
                        // Make marks badge float right
                        '[&_strong]:font-bold',
                        // Green answer text for lines after "Answer"
                        '[&_.answer-text]:text-emerald-700 [&_.answer-text]:dark:text-emerald-400'
                      )}>
                        <WorkedExampleContent>{children}</WorkedExampleContent>
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard callout box (Exam Tip, Key Definition, etc.)
              return (
                <div className={cn(
                  'not-prose my-6 border-l-4 rounded-r-lg p-4',
                  callout.borderColor,
                  callout.bgColor,
                  callout.textColor
                )}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', callout.iconBg)}>
                      {callout.icon}
                    </div>
                    <div className="flex-1 text-sm leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:font-bold">
                      {children}
                    </div>
                  </div>
                </div>
              );
            }

            // Default blockquote
            return (
              <blockquote
                className="border-l-4 border-primary/40 bg-primary/5 dark:bg-primary/10 py-2 px-4 rounded-r-lg not-italic text-foreground/80"
                {...props}
              >
                {children}
              </blockquote>
            );
          }
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Helper to generate heading IDs for anchor links
function generateId(children: React.ReactNode): string {
  const text = React.Children.toArray(children)
    .map(child => {
      if (typeof child === 'string') return child;
      if (React.isValidElement(child)) {
        const props = child.props as { children?: React.ReactNode };
        if (props.children) return generateId(props.children);
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

// Split markdown into sections at ## headings, render each in its own card
function splitMarkdownIntoSections(content: string): { title: string | null; body: string }[] {
  const lines = content.split('\n');
  const sections: { title: string | null; body: string }[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let hasIntro = false;

  for (const line of lines) {
    // Match ## headings (not # or ###)
    const h2Match = line.match(/^## (.+)$/);
    if (h2Match) {
      // Save previous section
      const bodyText = currentLines.join('\n').trim();
      if (bodyText || currentTitle) {
        sections.push({ title: currentTitle, body: bodyText });
      } else if (currentLines.length === 0 && !currentTitle && !hasIntro) {
        // Skip empty intro
      }
      currentTitle = h2Match[1];
      currentLines = [];
      hasIntro = true;
    } else {
      currentLines.push(line);
    }
  }

  // Push the last section
  const bodyText = currentLines.join('\n').trim();
  if (bodyText || currentTitle) {
    sections.push({ title: currentTitle, body: bodyText });
  }

  return sections;
}

interface SplitCardRendererProps {
  content: string;
  className?: string;
  hasLatex?: boolean;
  noteTitle?: string;
}

export function SplitCardRenderer({ content, className, hasLatex = false, noteTitle }: SplitCardRendererProps) {
  const sections = useMemo(() => splitMarkdownIntoSections(content), [content]);

  // If there's only one section (no ## headings), render normally without cards
  if (sections.length <= 1) {
    return (
      <div className={cn('bg-card rounded-2xl border shadow-sm p-6 sm:p-8', className)}>
        <MarkdownRenderer content={content} hasLatex={hasLatex} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {sections.map((section, index) => (
        <div
          key={index}
          className="bg-card rounded-2xl border shadow-sm p-6 sm:p-8 scroll-mt-20"
          id={section.title ? generateIdFromString(section.title) : undefined}
        >
          {section.title && (
            <h2 className={cn(
              "font-bold text-foreground",
              index === 0 ? "text-3xl sm:text-4xl mb-6 text-center" : "text-xl sm:text-2xl mb-4"
            )}>
              {section.title}
            </h2>
          )}
          {section.body && (
            <MarkdownRenderer
              content={section.body}
              hasLatex={hasLatex}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper to generate heading IDs from plain strings (for SplitCardRenderer)
function generateIdFromString(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export default MarkdownRenderer;
