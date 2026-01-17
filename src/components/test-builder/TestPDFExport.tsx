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
import { Download, Loader2, FileText, Key, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pdfGenerationService, PDFTestOptions } from '@/lib/pdf/pdf-generation-service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface TestPDFExportProps {
  testId?: string;
  assessmentId?: string;
  testTitle: string;
  trigger?: React.ReactNode;
}

export function TestPDFExport({ testId, assessmentId, testTitle, trigger }: TestPDFExportProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState<'student' | 'teacher'>('student');
  const [options, setOptions] = useState<PDFTestOptions>({
    includeAnswers: false,
    includeMarkScheme: false,
    paperSize: 'A4',
    fontSize: 'medium'
  });

  const handleExport = useCallback(async () => {
    if (!assessmentId && !testId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No test or assessment ID provided'
      });
      return;
    }

    setIsExporting(true);

    try {
      // Set options based on export type
      const exportOptions: PDFTestOptions = {
        ...options,
        includeAnswers: exportType === 'teacher',
        includeMarkScheme: exportType === 'teacher'
      };

      // Generate HTML content
      const htmlContent = await pdfGenerationService.generateTestPDF(
        assessmentId || testId || '',
        exportOptions
      );

      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = options.paperSize === 'A4' ? '210mm' : '8.5in';
      document.body.appendChild(container);

      // Generate PDF using html2canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false
      });

      document.body.removeChild(container);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: options.paperSize.toLowerCase() as 'a4' | 'letter'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Download
      const fileName = `${testTitle.toLowerCase().replace(/\s+/g, '-')}-${exportType === 'teacher' ? 'answer-key' : 'student'}.pdf`;
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
  }, [testId, assessmentId, testTitle, options, exportType, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export Test as PDF
          </DialogTitle>
          <DialogDescription>
            Generate a printable PDF version of this test
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Type Selection */}
          <div className="space-y-3">
            <Label>Export Type</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType('student')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'student'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <BookOpen className={`h-6 w-6 mb-2 ${exportType === 'student' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium">Student Version</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Questions only, no answers
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportType('teacher')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  exportType === 'teacher'
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-muted-foreground/50'
                }`}
              >
                <Key className={`h-6 w-6 mb-2 ${exportType === 'teacher' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="font-medium">Answer Key</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Includes answers & mark scheme
                </div>
              </button>
            </div>
          </div>

          {/* Paper Size */}
          <div className="flex items-center justify-between">
            <Label htmlFor="paper-size">Paper size</Label>
            <Select
              value={options.paperSize}
              onValueChange={(value: 'A4' | 'Letter') => 
                setOptions(prev => ({ ...prev, paperSize: value }))
              }
            >
              <SelectTrigger id="paper-size" className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A4">A4</SelectItem>
                <SelectItem value="Letter">Letter</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div className="flex items-center justify-between">
            <Label htmlFor="font-size">Font size</Label>
            <Select
              value={options.fontSize}
              onValueChange={(value: 'small' | 'medium' | 'large') => 
                setOptions(prev => ({ ...prev, fontSize: value }))
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

          {/* Preview info */}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">
              {exportType === 'student' ? 'Student Version' : 'Teacher Answer Key'}
            </p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Questions with answer spaces</li>
              {exportType === 'teacher' && (
                <>
                  <li>• Correct answers highlighted</li>
                  <li>• Mark scheme included</li>
                </>
              )}
              <li>• {options.paperSize} format, {options.fontSize} font</li>
            </ul>
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
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TestPDFExport;
