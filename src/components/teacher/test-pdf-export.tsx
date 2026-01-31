'use client';

import { useState } from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Download, Loader2, Upload, Eye } from 'lucide-react';

interface Question {
  id: string;
  stem_md?: string;
  stem_markdown?: string;
  question_type: string;
  marks: number;
  options?: { id: string; text: string }[] | null;
  correct_answer?: any;
  examiner_comment?: string;
  // Multi-part question support
  parent_question_id?: string | null;
  part_label?: string | null;
  question_number?: string;
  // Image support for image-heavy subjects
  image_url?: string | null;
  // Full question image mode
  question_image_url?: string | null;
  use_image_question?: boolean;
}

interface TestSection {
  name: string;
  questions: {
    questionId: string;
    marks: number;
    order: number;
    question?: Question;
  }[];
}

interface TestData {
  id: string;
  title: string;
  description?: string;
  duration_minutes?: number | null;
  total_marks: number;
  total_questions: number;
  sections: TestSection[];
  allow_calculator?: boolean;
}

interface PDFOptions {
  schoolName: string;
  schoolLogoUrl: string;
  showCentreNumber: boolean;
  showCandidateNumber: boolean;
  includeAnswers: boolean;
}

interface TestPDFExportProps {
  test: TestData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// PDF Styles - Cambridge IGCSE Exam Paper Format
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 50,
    paddingLeft: 50,
    paddingRight: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
  },
  // Cover page styles
  coverPage: {
    paddingTop: 30,
    paddingBottom: 40,
    paddingLeft: 50,
    paddingRight: 50,
  },
  schoolLogo: {
    width: 80,
    height: 80,
    marginBottom: 15,
    alignSelf: 'center',
  },
  examBoard: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  trademark: {
    fontSize: 10,
    position: 'absolute',
    top: 30,
    right: 50,
  },
  candidateBox: {
    flexDirection: 'row',
    marginBottom: 15,
    alignItems: 'center',
  },
  candidateLabel: {
    width: 80,
    fontSize: 10,
    fontWeight: 'bold',
  },
  candidateInput: {
    flex: 1,
    height: 30,
    borderWidth: 1,
    borderColor: '#000',
  },
  centreRow: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  centreLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginRight: 10,
  },
  centreBoxes: {
    flexDirection: 'row',
  },
  centreBox: {
    width: 25,
    height: 25,
    borderWidth: 1,
    borderColor: '#000',
    marginRight: 2,
  },
  dividerLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    marginVertical: 8,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  subjectTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  paperInfo: {
    fontSize: 11,
    marginBottom: 3,
  },
  paperInfoRight: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  paperMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  instructionsSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  instructionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  instructionItem: {
    fontSize: 10,
    marginBottom: 3,
    flexDirection: 'row',
  },
  bullet: {
    width: 15,
    fontSize: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 10,
    lineHeight: 1.4,
  },
  // Question styles - Cambridge format
  questionRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  questionNumberCol: {
    width: 30,
    fontWeight: 'bold',
    fontSize: 11,
  },
  questionContentCol: {
    flex: 1,
    paddingRight: 40,
  },
  marksCol: {
    width: 30,
    textAlign: 'right',
    fontSize: 11,
  },
  questionText: {
    fontSize: 11,
    lineHeight: 1.5,
    marginBottom: 4,
  },
  subQuestionRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 25,
  },
  subQuestionLabel: {
    width: 35,
    fontWeight: 'bold',
    fontSize: 11,
  },
  subQuestionContent: {
    flex: 1,
    paddingRight: 40,
  },
  partLabel: {
    fontWeight: 'bold',
    fontSize: 11,
    marginRight: 8,
  },
  // Answer lines - solid dotted style like Cambridge exams
  answerLineRow: {
    flexDirection: 'row',
    marginTop: 0,
    marginBottom: 0,
    alignItems: 'flex-end',
    height: 22,
  },
  answerLine: {
    flex: 1,
    height: 22,
    borderBottomWidth: 0.5,
    borderBottomColor: '#000',
    borderStyle: 'dotted',
  },
  lineMarks: {
    width: 35,
    textAlign: 'right',
    fontSize: 11,
    paddingLeft: 8,
    paddingBottom: 2,
  },
  // MCQ options
  optionsContainer: {
    marginTop: 8,
    marginLeft: 0,
  },
  optionRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  optionLabel: {
    width: 25,
    fontWeight: 'bold',
    fontSize: 11,
  },
  optionText: {
    flex: 1,
    fontSize: 11,
  },
  // Answer key section
  answerKeySection: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f8f0',
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
  },
  answerKeyTitle: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 5,
    color: '#2e7d32',
  },
  answerKeyText: {
    fontSize: 10,
    marginBottom: 3,
  },
  examinerComment: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#555',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 0.5,
    borderTopColor: '#c8e6c9',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
  pageNumber: {
    position: 'absolute',
    bottom: 25,
    right: 50,
    fontSize: 9,
    color: '#333',
  },
  endOfPaper: {
    textAlign: 'center',
    marginTop: 30,
    fontSize: 11,
    fontWeight: 'bold',
  },
  // Question image style for image-heavy subjects - maintain aspect ratio and clarity
  questionImage: {
    maxWidth: '100%',
    maxHeight: 400,
    marginBottom: 12,
    marginTop: 8,
    objectFit: 'contain',
  },
  // Full question image style for picture mode - larger and clearer
  fullQuestionImage: {
    width: '100%',
    maxHeight: 500,
    marginBottom: 16,
    marginTop: 4,
    objectFit: 'contain',
  },
});

// Helper to strip markdown
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/`(.*?)`/g, '$1') // Code
    .replace(/#{1,6}\s/g, '') // Headers
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
    .replace(/!\[(.*?)\]\(.*?\)/g, '[Image: $1]') // Images
    .replace(/>\s/g, '') // Blockquotes
    .replace(/[-*+]\s/g, '• ') // Lists
    .trim();
}

// Check if question has content (text or image)
function hasQuestionContent(question: Question): boolean {
  const hasText = !!(question.stem_markdown || question.stem_md);
  const hasImage = !!question.image_url;
  return hasText || hasImage;
}

// Generate dotted line string for PDF
function generateDots(length: number = 80): string {
  return '.'.repeat(length);
}

// Parse options for PDF - handles various option formats and filters out invalid entries
function parseOptionsForPDF(options: any): { label: string; text: string }[] {
  if (!options) return [];
  
  // Handle empty object
  if (typeof options === 'object' && !Array.isArray(options) && Object.keys(options).length === 0) {
    return [];
  }
  
  if (Array.isArray(options)) {
    return options
      .filter(opt => opt !== null && opt !== undefined)
      .map((opt, idx) => {
        // Handle string options
        if (typeof opt === 'string') {
          return {
            label: String.fromCharCode(65 + idx),
            text: opt,
          };
        }
        // Handle object options
        const text = opt.text || opt.value || '';
        // Skip if text would be [object Object] or empty
        if (!text || text === '[object Object]' || (typeof opt === 'object' && !opt.text && !opt.value)) {
          return {
            label: opt.label || String.fromCharCode(65 + idx),
            text: '', // Empty text instead of [object Object]
          };
        }
        return {
          label: opt.label || String.fromCharCode(65 + idx),
          text: text,
        };
      })
      .filter(opt => opt.text); // Filter out empty options
  }
  
  if (typeof options === 'object') {
    return Object.entries(options)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const text = typeof value === 'string' ? value : (typeof value === 'object' ? '' : String(value));
        return {
          label: key.toUpperCase(),
          text: text,
        };
      })
      .filter(opt => opt.text && opt.text !== '[object Object]');
  }
  
  return [];
}

// Get number of answer lines based on marks and question type
// Cambridge style: approximately 2 lines per mark for short answers, more for extended responses
function getAnswerLineCount(marks: number, type: string): number {
  if (type === 'mcq' || type === 'multiple_choice' || type === 'Multiple Choice' || type === 'tf') return 0;
  if (type === 'numeric') return 1;
  
  // For written answers based on marks:
  // 1 mark = 2 lines
  // 2 marks = 4 lines  
  // 3-4 marks = 6 lines
  // 5-6 marks = 10 lines (extended response)
  // 7+ marks = 12 lines (essay-style)
  if (marks <= 1) return 2;
  if (marks <= 2) return 4;
  if (marks <= 4) return 6;
  if (marks <= 6) return 10;
  return 12;
}

// Question Paper PDF Component - Cambridge IGCSE Style
function QuestionPaperPDF({ test, options }: { test: TestData; options: PDFOptions }) {
  let questionNumber = 0;

  // Format duration
  const formatDuration = (minutes: number | null | undefined): string => {
    if (!minutes) return '';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
    }
    return `${minutes} minutes`;
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        {/* School Logo (optional) */}
        {options.schoolLogoUrl && (
          <Image src={options.schoolLogoUrl} style={styles.schoolLogo} />
        )}

        {/* School Name (optional) */}
        {options.schoolName && (
          <Text style={styles.schoolName}>{options.schoolName}</Text>
        )}

        {/* Candidate Name Box */}
        <View style={styles.candidateBox}>
          <Text style={styles.candidateLabel}>CANDIDATE{'\n'}NAME</Text>
          <View style={styles.candidateInput} />
        </View>

        {/* Centre and Candidate Number (optional) */}
        {(options.showCentreNumber || options.showCandidateNumber) && (
          <View style={styles.centreRow}>
            {options.showCentreNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.centreLabel}>CENTRE{'\n'}NUMBER</Text>
                <View style={styles.centreBoxes}>
                  {[1, 2, 3, 4].map(i => <View key={i} style={styles.centreBox} />)}
                </View>
              </View>
            )}
            {options.showCandidateNumber && (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.centreLabel}>CANDIDATE{'\n'}NUMBER</Text>
                <View style={styles.centreBoxes}>
                  {[1, 2, 3, 4].map(i => <View key={i} style={styles.centreBox} />)}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerLine} />

        {/* Subject and Paper Info */}
        <View style={styles.paperMeta}>
          <View>
            <Text style={styles.subjectTitle}>{test.title.toUpperCase()}</Text>
            {test.description && <Text style={styles.paperInfo}>{test.description}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.paperInfoRight}>{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
            {test.duration_minutes && (
              <Text style={styles.paperInfoRight}>{formatDuration(test.duration_minutes)}</Text>
            )}
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.dividerLine} />
        
        <Text style={{ fontSize: 10, marginTop: 8, marginBottom: 4 }}>
          You must answer on the question paper.
        </Text>
        <Text style={{ fontSize: 10, marginBottom: 12 }}>
          No additional materials are needed.
        </Text>

        <View style={styles.dividerLine} />

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionTitle}>INSTRUCTIONS</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>Answer <Text style={{ fontWeight: 'bold' }}>all</Text> questions.</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>Use a black or dark blue pen.</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>Write your name, centre number and candidate number in the boxes at the top of the page.</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>Write your answer to each question in the space provided.</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>Do <Text style={{ fontWeight: 'bold' }}>not</Text> use an erasable pen or correction fluid.</Text>
          </View>
          {test.allow_calculator ? (
            <View style={styles.instructionItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.instructionText}>You may use a calculator.</Text>
            </View>
          ) : (
            <View style={styles.instructionItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.instructionText}>You may <Text style={{ fontWeight: 'bold' }}>not</Text> use a calculator.</Text>
            </View>
          )}
        </View>

        <View style={styles.instructionsSection}>
          <Text style={styles.instructionTitle}>INFORMATION</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>The total mark for this paper is <Text style={{ fontWeight: 'bold' }}>{test.total_marks}</Text>.</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.instructionText}>The number of marks for each question or part question is shown in brackets [ ].</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} fixed>
          This document was generated by IGA Prep
        </Text>
      </Page>

      {/* Questions Pages */}
      <Page size="A4" style={styles.page}>
        {test.sections && Array.isArray(test.sections) && test.sections.map((section, sectionIndex) => {
          // Group questions by question_number for proper display
          let lastQuestionNumber: string | null = null;
          
          return (
          <View key={sectionIndex}>
            {section.questions.map((tq, qIndex) => {
              const question = tq.question;
              if (!question) return null;

              // Determine if this is a new main question or a sub-part
              const currentQNum = question.question_number;
              const isNewMainQuestion = !currentQNum || currentQNum !== lastQuestionNumber;
              const hasPart = !!question.part_label;
              
              // Only increment question number for new main questions
              if (isNewMainQuestion) {
                questionNumber++;
                lastQuestionNumber = currentQNum || null;
              }

              const rawQuestionText = stripMarkdown(question.stem_markdown || question.stem_md || '');
              // Don't show [Image Question] placeholder if we have an actual image
              const hasImageUrl = !!(question.image_url || question.question_image_url);
              const questionText = (rawQuestionText === '[Image Question]' && hasImageUrl) ? '' : rawQuestionText;
              const lineCount = getAnswerLineCount(tq.marks, question.question_type);
              const isLastLine = qIndex === section.questions.length - 1;

              // Format display number: "5" for main, "5(a)" for parts
              const displayNumber = hasPart && !isNewMainQuestion 
                ? '' // Sub-parts don't show main number again
                : String(questionNumber);

              // Context questions (0 marks, no part label) should have less bottom margin
              const isContextQuestion = tq.marks === 0 && !hasPart;
              const bottomMargin = isContextQuestion ? 4 : (hasPart && !isNewMainQuestion ? 12 : 20);

              return (
                <View key={tq.questionId} style={{ marginBottom: bottomMargin }} wrap={false}>
                  {/* Question Row: Number | Content | (marks on last line) */}
                  <View style={hasPart && !isNewMainQuestion ? styles.subQuestionRow : styles.questionRow}>
                    {hasPart ? (
                      <Text style={styles.subQuestionLabel}>({question.part_label})</Text>
                    ) : (
                      <Text style={styles.questionNumberCol}>{displayNumber}</Text>
                    )}
                    <View style={styles.questionContentCol}>
                      {/* Show question text if available (not placeholder text) */}
                      {questionText && (
                        <Text style={styles.questionText}>{questionText}</Text>
                      )}
                      
                      {/* Show question image if available - use larger style for picture mode */}
                      {hasImageUrl && (
                        <Image 
                          src={(question.question_image_url || question.image_url)!} 
                          style={question.use_image_question ? styles.fullQuestionImage : styles.questionImage} 
                        />
                      )}
                      
                      {/* Show placeholder if no text and no image */}
                      {!questionText && !hasImageUrl && (
                        <Text style={styles.questionText}>[Question content not available]</Text>
                      )}
                      
                      {/* MCQ Options */}
                      {(question.question_type === 'mcq' || question.question_type === 'multiple_choice' || question.question_type === 'Multiple Choice') && question.options && (
                        <View style={styles.optionsContainer}>
                          {parseOptionsForPDF(question.options).map((opt: any, idx: number) => (
                            <View key={idx} style={styles.optionRow}>
                              <Text style={styles.optionLabel}>
                                {opt.label || String.fromCharCode(65 + idx)}
                              </Text>
                              <Text style={styles.optionText}>{opt.text}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* True/False Options */}
                      {question.question_type === 'tf' && (
                        <View style={styles.optionsContainer}>
                          <View style={styles.optionRow}>
                            <Text style={styles.optionLabel}>A</Text>
                            <Text style={styles.optionText}>True</Text>
                          </View>
                          <View style={styles.optionRow}>
                            <Text style={styles.optionLabel}>B</Text>
                            <Text style={styles.optionText}>False</Text>
                          </View>
                        </View>
                      )}

                      {/* Answer Lines - Cambridge style solid lines (only for questions with marks > 0) */}
                      {lineCount > 0 && tq.marks > 0 && (
                        <View style={{ marginTop: 6 }}>
                          {Array.from({ length: lineCount }).map((_, lineIdx) => (
                            <View key={lineIdx} style={styles.answerLineRow}>
                              <View style={styles.answerLine} />
                              {/* Show marks only on the last line */}
                              <Text style={styles.lineMarks}>
                                {lineIdx === lineCount - 1 ? `[${tq.marks}]` : ''}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* For MCQ/TF - show marks only (no answer line - students circle the letter) */}
                      {(question.question_type === 'mcq' || question.question_type === 'multiple_choice' || question.question_type === 'Multiple Choice' || question.question_type === 'tf') && tq.marks > 0 && (
                        <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                          <Text style={{ fontSize: 11 }}>[{tq.marks}]</Text>
                        </View>
                      )}

                      {/* Answer Key (if included) */}
                      {options.includeAnswers && question.correct_answer && (
                        <View style={styles.answerKeySection}>
                          <Text style={styles.answerKeyTitle}>Answer:</Text>
                          <Text style={styles.answerKeyText}>
                            {formatAnswerForPDF(question.correct_answer, question.question_type)}
                          </Text>
                          {question.examiner_comment && (
                            <Text style={styles.examinerComment}>
                              Examiner's Notes: {question.examiner_comment}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
          );
        })}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {new Date().getFullYear()}
        </Text>
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber}`}
          fixed
        />
      </Page>
    </Document>
  );
}

// Helper to format answer for PDF
function formatAnswerForPDF(answer: any, type: string): string {
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'number') return String(answer);
  if (typeof answer === 'boolean') return answer ? 'True' : 'False';
  
  if (type === 'mcq') {
    if (typeof answer === 'object' && answer.label) return `Option ${answer.label}`;
    return `Option ${answer}`;
  }
  
  if (typeof answer === 'object') {
    if (answer.value !== undefined) return String(answer.value);
    if (Array.isArray(answer)) return answer.join(', ');
  }
  
  return JSON.stringify(answer);
}

export function TestPDFExport({ test, open, onOpenChange }: TestPDFExportProps) {
  const [schoolName, setSchoolName] = useState('');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [showCentreNumber, setShowCentreNumber] = useState(true);
  const [showCandidateNumber, setShowCandidateNumber] = useState(true);
  const [includeAnswers, setIncludeAnswers] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo file must be less than 2MB');
        return;
      }

      setLogoFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        setSchoolLogoUrl(result); // Use base64 for PDF
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setSchoolLogoUrl('');
  };

  // Clean up preview URL when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    onOpenChange(newOpen);
  };

  async function generatePDFBlob() {
    let testWithQuestions = { ...test };
    const assessmentId = test.id;
    
    // If test already has questions in sections (preview mode or from test builder), use them directly
    if (test.sections && test.sections.length > 0 && test.sections[0].questions && test.sections[0].questions.length > 0) {
      testWithQuestions = { ...test };
    } else if (assessmentId && assessmentId !== 'preview') {
      // Load questions from database for saved tests
      const supabase = (await import('@/lib/supabase/client')).createClient();
      
      const { data: aqData, error: aqError } = await supabase
        .from('assessment_questions')
        .select('*')
        .eq('assessment_id', assessmentId)
        .order('question_order', { ascending: true });

      if (aqData && aqData.length > 0) {
        const questionIds = aqData.map((aq: any) => aq.question_id).filter(Boolean);
        
        const { data: questionsData } = await supabase
          .from('questions')
          .select('*')
          .in('id', questionIds);

        const questionsWithData = aqData.map((aq: any, index: number) => {
          const questionData = questionsData?.find((q: any) => q.id === aq.question_id);
          const marks = aq.custom_marks ?? questionData?.marks ?? 1;
          return {
            questionId: aq.question_id,
            marks,
            order: index + 1,
            question: questionData || null
          };
        });

        testWithQuestions.sections = [{
          name: 'Section A',
          questions: questionsWithData
        }];
      } else {
        testWithQuestions.sections = [];
      }
    } else {
      testWithQuestions.sections = [];
    }

    const options: PDFOptions = {
      schoolName,
      schoolLogoUrl,
      showCentreNumber,
      showCandidateNumber,
      includeAnswers,
    };

    return await pdf(
      <QuestionPaperPDF test={testWithQuestions} options={options} />
    ).toBlob();
  }

  async function handlePreview() {
    setPreviewing(true);
    try {
      // Clean up previous preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      const blob = await generatePDFBlob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Error generating PDF preview:', error);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleExport() {
    setGenerating(true);
    try {
      const blob = await generatePDFBlob();

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${test.title.replace(/[^a-z0-9]/gi, '_')}${includeAnswers ? '_with_answers' : ''}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      handleOpenChange(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={`${previewUrl ? 'max-w-5xl' : 'max-w-md'} max-h-[90vh] flex flex-col transition-all duration-300`}>
        <DialogHeader>
          <DialogTitle>Export Test as PDF</DialogTitle>
          <DialogDescription>
            Customize and download "{test.title}" as a printable PDF.
          </DialogDescription>
        </DialogHeader>

        <div className={`py-4 overflow-y-auto flex-1 ${previewUrl ? 'flex gap-6' : ''}`}>
          {/* Settings Panel */}
          <div className={`space-y-4 ${previewUrl ? 'w-80 flex-shrink-0' : ''}`}>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-medium">{test.title}</p>
              <p className="text-sm text-muted-foreground">
                {test.total_questions} questions • {test.total_marks} marks
                {test.duration_minutes && ` • ${test.duration_minutes} minutes`}
              </p>
            </div>

          {/* School Name */}
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name (optional)</Label>
            <input
              id="schoolName"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name..."
              className="w-full px-3 py-2 border rounded-md text-sm"
            />
          </div>

          {/* School Logo Upload */}
          <div className="space-y-2">
            <Label htmlFor="schoolLogo">School Logo (optional)</Label>
            {logoPreview ? (
              <div className="space-y-2">
                <div className="relative w-32 h-32 border rounded-md overflow-hidden">
                  <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveLogo}
                  className="w-full"
                >
                  Remove Logo
                </Button>
              </div>
            ) : (
              <div>
                <input
                  id="schoolLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <label
                  htmlFor="schoolLogo"
                  className="flex items-center justify-center w-full px-4 py-8 border-2 border-dashed rounded-md cursor-pointer hover:border-primary transition-colors"
                >
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Click to upload logo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* Cover Page Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Cover Page Options</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="showCentreNumber"
                checked={showCentreNumber}
                onCheckedChange={(checked) => setShowCentreNumber(checked as boolean)}
              />
              <Label htmlFor="showCentreNumber" className="text-sm font-normal">
                Show Centre Number field
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showCandidateNumber"
                checked={showCandidateNumber}
                onCheckedChange={(checked) => setShowCandidateNumber(checked as boolean)}
              />
              <Label htmlFor="showCandidateNumber" className="text-sm font-normal">
                Show Candidate Number field
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeAnswers"
                checked={includeAnswers}
                onCheckedChange={(checked) => setIncludeAnswers(checked as boolean)}
              />
              <Label htmlFor="includeAnswers" className="text-sm font-normal">
                Include answer key (for teacher use)
              </Label>
            </div>
          </div>
          </div>

          {/* PDF Preview Panel */}
          {previewUrl && (
            <div className="flex-1 min-w-0 border rounded-lg overflow-hidden bg-gray-100">
              <iframe
                src={previewUrl}
                className="w-full h-full min-h-[500px]"
                title="PDF Preview"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            variant="outline" 
            onClick={handlePreview} 
            disabled={previewing || test.total_questions === 0}
          >
            {previewing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {previewing ? 'Loading...' : (previewUrl ? 'Refresh Preview' : 'Preview PDF')}
          </Button>
          <Button onClick={handleExport} disabled={generating || test.total_questions === 0}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Download PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
