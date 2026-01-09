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

// PDF Generation Function
async function generateNotePDF(
  note: Note,
  sections: NoteSection[],
  options: NotePDFOptions
): Promise<jsPDF> {
  const { paper_size, font_size, include_toc, include_header, include_footer, include_sections } = options;

  // Paper dimensions
  const paperSizes = {
    a4: { width: 210, height: 297 },
    letter: { width: 215.9, height: 279.4 }
  };
  const { width, height } = paperSizes[paper_size];

  // Font sizes
  const fontSizes = {
    small: { title: 18, heading: 14, body: 10, small: 8 },
    medium: { title: 22, heading: 16, body: 12, small: 10 },
    large: { title: 26, heading: 18, body: 14, small: 12 }
  };
  const fonts = fontSizes[font_size];

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paper_size
  });

  const margin = 20;
  const contentWidth = width - (margin * 2);
  let currentY = margin;
  let pageNumber = 1;

  // Helper: Add page header
  const addHeader = () => {
    if (!include_header) return;
    pdf.setFontSize(fonts.small);
    pdf.setTextColor(128, 128, 128);
    pdf.text(note.title, margin, 10);
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, 12, width - margin, 12);
  };

  // Helper: Add page footer
  const addFooter = () => {
    if (!include_footer) return;
    pdf.setFontSize(fonts.small);
    pdf.setTextColor(128, 128, 128);
    pdf.text(`Page ${pageNumber}`, width / 2, height - 10, { align: 'center' });
  };

  // Helper: Check and add new page if needed
  const checkNewPage = (neededHeight: number) => {
    if (currentY + neededHeight > height - margin - 15) {
      addFooter();
      pdf.addPage();
      pageNumber++;
      currentY = margin;
      addHeader();
      currentY = include_header ? 20 : margin;
    }
  };

  // Helper: Add text with word wrap
  const addText = (text: string, fontSize: number, isBold = false, color = [0, 0, 0]) => {
    pdf.setFontSize(fontSize);
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.4;
    
    for (const line of lines) {
      checkNewPage(lineHeight);
      pdf.text(line, margin, currentY);
      currentY += lineHeight;
    }
  };

  // Start first page
  addHeader();
  currentY = include_header ? 25 : margin;

  // Title
  addText(note.title, fonts.title, true);
  currentY += 5;

  // Subtitle
  if (note.subtitle) {
    addText(note.subtitle, fonts.heading, false, [100, 100, 100]);
    currentY += 3;
  }

  // Meta info
  pdf.setFontSize(fonts.small);
  pdf.setTextColor(128, 128, 128);
  const metaText = `${note.estimated_read_time || 5} min read`;
  pdf.text(metaText, margin, currentY);
  currentY += 10;

  // Separator
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, currentY, width - margin, currentY);
  currentY += 10;

  // Table of Contents
  if (include_toc && sections.length > 0) {
    addText('Table of Contents', fonts.heading, true);
    currentY += 5;

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const tocText = `${i + 1}. ${section.title}`;
      addText(tocText, fonts.body, false, [60, 60, 60]);
    }

    currentY += 10;
    pdf.line(margin, currentY, width - margin, currentY);
    currentY += 10;
  }

  // Main content or sections
  if (include_sections && sections.length > 0) {
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      
      // Section title
      checkNewPage(20);
      addText(`${i + 1}. ${section.title}`, fonts.heading, true);
      currentY += 5;

      // Section content (simplified - strips markdown)
      const plainContent = stripMarkdown(section.content_md);
      if (plainContent) {
        addText(plainContent, fonts.body);
        currentY += 8;
      }
    }
  } else {
    // Just the main note content
    const plainContent = stripMarkdown(note.content_md);
    if (plainContent) {
      addText(plainContent, fonts.body);
    }
  }

  // Final footer
  addFooter();

  return pdf;
}

// Helper to strip markdown formatting for plain text PDF
function stripMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  return markdown
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Remove images
    .replace(/!\[.*?\]\(.+?\)/g, '')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`(.+?)`/g, '$1')
    // Remove blockquotes
    .replace(/^>\s+/gm, '')
    // Remove horizontal rules
    .replace(/^---+$/gm, '')
    // Remove list markers
    .replace(/^[\*\-\+]\s+/gm, '• ')
    .replace(/^\d+\.\s+/gm, '')
    // Remove extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default NotesPDFExport;
