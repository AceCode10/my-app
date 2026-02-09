'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Note, NoteSection, NotePDFOptions } from '@/types/notes';
import { getNoteSectionsFlat } from '@/lib/supabase/notes';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface NotesPDFExportProps {
  note: Note;
  sections?: NoteSection[];
  trigger?: React.ReactNode;
}

export function NotesPDFExport({ note, sections: propSections, trigger }: NotesPDFExportProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<NotePDFOptions>({
    include_sections: true,
    include_toc: true,
    paper_size: 'a4',
    font_size: 'medium',
    include_header: true,
    include_footer: true
  });

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      // Get sections if not provided
      let sections = propSections;
      if (!sections && options.include_sections) {
        sections = await getNoteSectionsFlat(note.id);
      }

      // Create PDF
      const pdf = await generateNotePDF(note, sections || [], options);
      
      // Download
      const fileName = `${note.slug || note.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      pdf.save(fileName);

      toast({
        title: 'PDF exported!',
        description: `${fileName} has been downloaded.`
      });

      setIsOpen(false);
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        variant: 'destructive',
        title: 'Export failed',
        description: 'Could not generate PDF. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [note, propSections, options, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export as PDF
          </DialogTitle>
          <DialogDescription>
            Customize your PDF export options
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Include Sections */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-sections" className="flex flex-col gap-1">
              <span>Include all sections</span>
              <span className="text-xs text-muted-foreground font-normal">
                Export the complete note with all sections
              </span>
            </Label>
            <Switch
              id="include-sections"
              checked={options.include_sections}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, include_sections: checked }))
              }
            />
          </div>

          {/* Include TOC */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-toc" className="flex flex-col gap-1">
              <span>Include table of contents</span>
              <span className="text-xs text-muted-foreground font-normal">
                Add a table of contents at the beginning
              </span>
            </Label>
            <Switch
              id="include-toc"
              checked={options.include_toc}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, include_toc: checked }))
              }
            />
          </div>

          {/* Paper Size */}
          <div className="flex items-center justify-between">
            <Label htmlFor="paper-size">Paper size</Label>
            <Select
              value={options.paper_size}
              onValueChange={(value: 'a4' | 'letter') => 
                setOptions(prev => ({ ...prev, paper_size: value }))
              }
            >
              <SelectTrigger id="paper-size" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4</SelectItem>
                <SelectItem value="letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <Label htmlFor="font-size">Font size</Label>
            <Select
              value={options.font_size}
              onValueChange={(value: 'small' | 'medium' | 'large') => 
                setOptions(prev => ({ ...prev, font_size: value }))
              }
            >
              <SelectTrigger id="font-size" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Include Header */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-header">Include header</Label>
            <Switch
              id="include-header"
              checked={options.include_header}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, include_header: checked }))
              }
            />
          </div>

          {/* Include Footer */}
          <div className="flex items-center justify-between">
            <Label htmlFor="include-footer">Include page numbers</Label>
            <Switch
              id="include-footer"
              checked={options.include_footer}
              onCheckedChange={(checked) => 
                setOptions(prev => ({ ...prev, include_footer: checked }))
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// PDF Generation Function - renders markdown as styled HTML and captures with html2canvas
async function generateNotePDF(
  note: Note,
  sections: NoteSection[],
  options: NotePDFOptions
): Promise<jsPDF> {
  const { paper_size, font_size, include_toc, include_header, include_footer, include_sections } = options;

  // Paper dimensions in points (for jsPDF)
  const paperSizes = {
    a4: { width: 595, height: 842 },
    letter: { width: 612, height: 792 }
  };
  const { width: pageWidth, height: pageHeight } = paperSizes[paper_size];

  // Font size scale
  const fontScales = { small: '14px', medium: '16px', large: '18px' };
  const baseFontSize = fontScales[font_size];

  // Margin in points
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2 - (include_header ? 20 : 0) - (include_footer ? 20 : 0);

  // Build HTML content to render
  let htmlContent = '';

  // Title
  htmlContent += `<h1 style="font-size:2em;font-weight:bold;margin:0 0 8px 0;color:#1a1a2e;">${escapeHtml(note.title)}</h1>`;
  if (note.subtitle) {
    htmlContent += `<p style="font-size:1.2em;color:#666;margin:0 0 12px 0;">${escapeHtml(note.subtitle)}</p>`;
  }
  htmlContent += `<p style="font-size:0.85em;color:#999;margin:0 0 16px 0;">${note.estimated_read_time || 5} min read</p>`;
  htmlContent += `<hr style="border:none;border-top:1px solid #ddd;margin:0 0 24px 0;">`;

  // Table of Contents
  if (include_toc && sections.length > 0) {
    htmlContent += `<div style="margin-bottom:24px;">`;
    htmlContent += `<h2 style="font-size:1.4em;font-weight:bold;margin:0 0 12px 0;">Table of Contents</h2>`;
    htmlContent += `<ol style="padding-left:20px;margin:0;">`;
    for (const section of sections) {
      htmlContent += `<li style="margin:4px 0;color:#444;">${escapeHtml(section.title)}</li>`;
    }
    htmlContent += `</ol>`;
    htmlContent += `<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">`;
    htmlContent += `</div>`;
  }

  // Content - use markdown rendered to simple HTML
  if (include_sections && sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      htmlContent += `<div style="margin-bottom:24px;">`;
      htmlContent += `<h2 style="font-size:1.3em;font-weight:bold;margin:0 0 8px 0;color:#1a1a2e;">${i + 1}. ${escapeHtml(section.title)}</h2>`;
      htmlContent += markdownToSimpleHtml(section.content_md);
      htmlContent += `</div>`;
    }
  } else {
    htmlContent += markdownToSimpleHtml(note.content_md);
  }

  // Create temporary off-screen container
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${contentWidth}px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: ${baseFontSize};
    line-height: 1.7;
    color: #1a1a2e;
    background: white;
    padding: 0;
  `;
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    // Capture with html2canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: contentWidth,
    });

    // Create PDF and paginate
    const pdf = new jsPDF('p', 'pt', paper_size);
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = contentWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;

    const headerY = include_header ? margin : margin - 15;
    const footerSpace = include_footer ? 20 : 0;
    const usableHeight = pageHeight - margin - headerY - footerSpace;

    let yOffset = 0;
    let pageNum = 0;

    while (yOffset < scaledHeight) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      // Header
      if (include_header) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(note.title, margin, margin - 5);
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, margin, pageWidth - margin, margin);
      }

      // Content image slice
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        margin,
        headerY + 5 - yOffset,
        contentWidth,
        scaledHeight
      );

      // Footer
      if (include_footer) {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `Page ${pageNum + 1}`,
          pageWidth / 2,
          pageHeight - margin + 10,
          { align: 'center' }
        );
      }

      yOffset += usableHeight;
      pageNum++;
    }

    return pdf;
  } finally {
    document.body.removeChild(container);
  }
}

// Convert markdown to simple inline HTML for PDF rendering
function markdownToSimpleHtml(md: string): string {
  if (!md) return '';

  let html = escapeHtml(md);

  // Headers
  html = html.replace(/^######\s+(.+)$/gm, '<h6 style="font-size:0.9em;font-weight:bold;margin:12px 0 4px 0;">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 style="font-size:0.95em;font-weight:bold;margin:12px 0 4px 0;">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 style="font-size:1em;font-weight:bold;margin:14px 0 6px 0;">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h3 style="font-size:1.1em;font-weight:bold;margin:16px 0 6px 0;">$1</h3>');
  html = html.replace(/^##\s+(.+)$/gm, '<h2 style="font-size:1.2em;font-weight:bold;margin:20px 0 8px 0;color:#1a1a2e;">$1</h2>');
  html = html.replace(/^#\s+(.+)$/gm, '<h1 style="font-size:1.5em;font-weight:bold;margin:24px 0 10px 0;">$1</h1>');

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:0.9em;">$1</code>');

  // Images - render as inline images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, 
    '<div style="text-align:center;margin:12px 0;"><img src="$2" alt="$1" style="max-width:100%;border-radius:8px;" crossorigin="anonymous"><div style="font-size:0.85em;color:#666;margin-top:4px;font-style:italic;">$1</div></div>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:#2563eb;text-decoration:underline;">$1</span>');

  // Blockquotes with callout detection
  html = html.replace(/^&gt;\s*\*\*(Exam Tip|Key Definition|Common Mistake|Warning|Note|Info):\*\*\s*(.+)$/gm,
    (_, type, content) => {
      const colors: Record<string, string> = {
        'Exam Tip': 'border-left:4px solid #f59e0b;background:#fffbeb;',
        'Key Definition': 'border-left:4px solid #3b82f6;background:#eff6ff;',
        'Common Mistake': 'border-left:4px solid #ef4444;background:#fef2f2;',
        'Warning': 'border-left:4px solid #ef4444;background:#fef2f2;',
        'Note': 'border-left:4px solid #6366f1;background:#f0f0ff;',
        'Info': 'border-left:4px solid #6366f1;background:#f0f0ff;',
      };
      return `<div style="${colors[type] || ''}padding:10px 14px;border-radius:0 6px 6px 0;margin:10px 0;"><strong>${type}:</strong> ${content}</div>`;
    }
  );

  // Regular blockquotes
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote style="border-left:4px solid #6366f1;background:#f8f8ff;padding:8px 14px;border-radius:0 6px 6px 0;margin:8px 0;font-style:italic;">$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">');

  // Tables (simple)
  html = html.replace(/^\|(.+)\|$/gm, (match) => {
    const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
    if (cells.every(c => /^[-:]+$/.test(c))) return ''; // skip separator row
    const isHeader = false; // simplified
    const tag = 'td';
    return '<tr>' + cells.map(c => 
      `<${tag} style="border:1px solid #ddd;padding:8px 12px;text-align:center;">${c}</${tag}>`
    ).join('') + '</tr>';
  });
  // Wrap consecutive tr elements in table
  html = html.replace(/((?:<tr>.+<\/tr>\n?)+)/g, 
    '<table style="border-collapse:collapse;width:100%;margin:12px 0;">$1</table>');

  // Unordered lists
  html = html.replace(/^[\*\-\+]\s+(.+)$/gm, '<li style="margin:4px 0;">$1</li>');
  html = html.replace(/((?:<li[^>]*>.+<\/li>\n?)+)/g, '<ul style="padding-left:24px;margin:8px 0;">$1</ul>');

  // Ordered lists  
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;">$1</li>');

  // Paragraphs - wrap remaining plain text lines
  html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p style="margin:6px 0;">$1</p>');

  // Clean up extra newlines
  html = html.replace(/\n{2,}/g, '');

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default NotesPDFExport;
