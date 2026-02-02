/**
 * PDF Generation Service
 * Export tests, results, and certificates to PDF
 */

import { createClient } from '@/lib/supabase/client';

export interface PDFTestOptions {
  includeAnswers: boolean;
  includeMarkScheme: boolean;
  paperSize: 'A4' | 'Letter';
  fontSize: 'small' | 'medium' | 'large';
}

export interface PDFResultsOptions {
  includeQuestions: boolean;
  includeCorrectAnswers: boolean;
  includeFeedback: boolean;
}

export class PDFGenerationService {
  private supabase = createClient();

  /**
   * Generate test PDF content (returns HTML for client-side PDF generation)
   */
  async generateTestPDF(assessmentId: string, options: PDFTestOptions): Promise<string> {
    try {
      // Fetch assessment
      const { data: assessment } = await this.supabase
        .from('assessments')
        .select(`
          *,
          subject:subjects(name),
          questions:assessment_questions(
            *,
            question:questions(
              *,
              choices:question_choices(*)
            )
          )
        `)
        .eq('id', assessmentId)
        .single();

      if (!assessment) throw new Error('Assessment not found');

      const fontSizeClass = {
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg'
      }[options.fontSize];

      let html = `
        <div class="pdf-container ${fontSizeClass}" style="font-family: 'Times New Roman', serif; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="margin: 0; font-size: 24px;">${assessment.title}</h1>
            ${assessment.subject ? `<p style="margin: 5px 0; color: #666;">${assessment.subject.name}</p>` : ''}
            <p style="margin: 5px 0; color: #666;">Total Marks: ${assessment.total_marks || 'N/A'}</p>
            ${assessment.duration_minutes ? `<p style="margin: 5px 0; color: #666;">Time Allowed: ${assessment.duration_minutes} minutes</p>` : ''}
          </div>
          
          ${assessment.instructions ? `
            <div style="border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; background: #f9f9f9;">
              <h3 style="margin: 0 0 10px 0;">Instructions</h3>
              <p style="margin: 0;">${assessment.instructions}</p>
            </div>
          ` : ''}
          
          <div class="questions">
      `;

      const questions = assessment.questions || [];
      questions.sort((a: any, b: any) => a.question_order - b.question_order);

      for (let i = 0; i < questions.length; i++) {
        const aq = questions[i];
        const q = aq.question;
        if (!q) continue;

        const marks = aq.custom_marks || q.marks || 0;
        
        // Check if this is a context-only question (no answer needed)
        const isContextOnly = q.is_context_only === true || q.needs_answer === false || marks === 0;

        // Context-only questions - display without marks or answer lines
        if (isContextOnly) {
          html += `
            <div style="margin-bottom: 15px; page-break-inside: avoid; padding: 10px; background: #f5f5f5; border-left: 3px solid #666;">
              <strong>Question ${i + 1}</strong>
              <p style="margin: 10px 0 0 0;">${q.stem_markdown}</p>
            </div>
          `;
          continue;
        }

        html += `
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <strong>Question ${i + 1}</strong>
              <span>[${marks} mark${marks !== 1 ? 's' : ''}]</span>
            </div>
            <p style="margin: 0 0 15px 0;">${q.stem_markdown}</p>
        `;

        // MCQ options
        if (q.question_type === 'mcq' && q.choices) {
          html += '<div style="margin-left: 20px;">';
          const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
          q.choices.sort((a: any, b: any) => (a.choice_order || 0) - (b.choice_order || 0));
          
          q.choices.forEach((choice: any, idx: number) => {
            const isCorrect = options.includeAnswers && choice.is_correct;
            html += `
              <div style="margin: 8px 0; ${isCorrect ? 'font-weight: bold; color: green;' : ''}">
                ${letters[idx]}. ${choice.choice_text}
                ${isCorrect ? ' ✓' : ''}
              </div>
            `;
          });
          html += '</div>';
        }

        // Answer lines for written questions
        if (['short_answer', 'essay', 'calculation'].includes(q.question_type)) {
          const lines = q.question_type === 'essay' ? 10 : 3;
          html += '<div style="margin-top: 15px;">';
          for (let l = 0; l < lines; l++) {
            html += '<div style="border-bottom: 1px solid #ccc; height: 25px; margin-bottom: 5px;"></div>';
          }
          html += '</div>';

          if (options.includeAnswers && q.correct_answer) {
            html += `
              <div style="margin-top: 10px; padding: 10px; background: #e8f5e9; border-left: 3px solid green;">
                <strong>Answer:</strong> ${q.correct_answer}
              </div>
            `;
          }
        }

        // Mark scheme
        if (options.includeMarkScheme && q.explanation) {
          html += `
            <div style="margin-top: 10px; padding: 10px; background: #fff3e0; border-left: 3px solid orange;">
              <strong>Mark Scheme:</strong> ${q.explanation}
            </div>
          `;
        }

        html += '</div>';
      }

      html += `
          </div>
          <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
            <p>Generated by IGA Prep</p>
          </div>
        </div>
      `;

      return html;
    } catch (error) {
      console.error('Error generating test PDF:', error);
      throw error;
    }
  }

  /**
   * Generate results PDF content
   */
  async generateResultsPDF(attemptId: string, options: PDFResultsOptions): Promise<string> {
    try {
      const { data: attempt } = await this.supabase
        .from('test_attempts')
        .select(`
          *,
          user:users(display_name, email),
          assignment:assignments(
            title,
            assessment:assessments(
              title,
              questions:assessment_questions(
                *,
                question:questions(
                  *,
                  choices:question_choices(*)
                )
              )
            )
          )
        `)
        .eq('id', attemptId)
        .single();

      if (!attempt) throw new Error('Attempt not found');

      const user = attempt.user;
      const assessment = attempt.assignment?.assessment;
      const percentage = attempt.percentage || 0;
      const grade = this.getGrade(percentage);

      let html = `
        <div class="pdf-container" style="font-family: Arial, sans-serif; padding: 40px;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
            <h1 style="margin: 0; font-size: 28px;">Test Results</h1>
            <h2 style="margin: 10px 0; font-size: 20px; color: #666;">${assessment?.title || 'Assessment'}</h2>
          </div>
          
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div>
              <p><strong>Student:</strong> ${user?.display_name || 'Unknown'}</p>
              <p><strong>Date:</strong> ${new Date(attempt.submitted_at || attempt.created_at).toLocaleDateString()}</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 48px; font-weight: bold; color: ${percentage >= 50 ? 'green' : 'red'}; margin: 0;">
                ${percentage}%
              </p>
              <p style="font-size: 24px; margin: 0;">Grade: ${grade}</p>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div>
                <p style="font-size: 24px; font-weight: bold; margin: 0;">${attempt.total_score || 0}</p>
                <p style="color: #666; margin: 5px 0 0 0;">Score</p>
              </div>
              <div>
                <p style="font-size: 24px; font-weight: bold; margin: 0;">${attempt.max_score || 0}</p>
                <p style="color: #666; margin: 5px 0 0 0;">Total Marks</p>
              </div>
              <div>
                <p style="font-size: 24px; font-weight: bold; margin: 0;">${grade}</p>
                <p style="color: #666; margin: 5px 0 0 0;">Grade</p>
              </div>
            </div>
          </div>
      `;

      // Question breakdown
      if (options.includeQuestions && assessment?.questions) {
        html += '<h3>Question Breakdown</h3><div style="margin-top: 15px;">';
        
        const answers = attempt.answers || {};
        const gradingDetails = attempt.grading_details || [];
        const gradingMap = new Map(gradingDetails.map((g: any) => [g.question_id, g]));

        assessment.questions.sort((a: any, b: any) => a.question_order - b.question_order);

        for (let i = 0; i < assessment.questions.length; i++) {
          const aq = assessment.questions[i];
          const q = aq.question;
          if (!q) continue;

          const grading = gradingMap.get(q.id);
          const studentAnswer = answers[q.id];
          const isCorrect = grading?.is_correct;
          const marksAwarded = grading?.marks_awarded || 0;
          const maxMarks = aq.custom_marks || q.marks || 1;

          html += `
            <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 10px; border-radius: 4px; ${isCorrect ? 'border-left: 4px solid green;' : 'border-left: 4px solid red;'}">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <strong>Q${i + 1}: ${q.stem_markdown.substring(0, 100)}${q.stem_markdown.length > 100 ? '...' : ''}</strong>
                <span style="color: ${isCorrect ? 'green' : 'red'}; font-weight: bold;">${marksAwarded}/${maxMarks}</span>
              </div>
          `;

          if (studentAnswer) {
            html += `<p><strong>Your Answer:</strong> ${this.formatAnswer(studentAnswer, q)}</p>`;
          }

          if (options.includeCorrectAnswers && !isCorrect) {
            html += `<p style="color: green;"><strong>Correct Answer:</strong> ${q.correct_answer || this.getCorrectChoice(q)}</p>`;
          }

          if (options.includeFeedback && grading?.feedback) {
            html += `<p style="color: #666; font-style: italic;"><strong>Feedback:</strong> ${grading.feedback}</p>`;
          }

          html += '</div>';
        }

        html += '</div>';
      }

      // Overall feedback
      if (options.includeFeedback && attempt.teacher_feedback) {
        html += `
          <div style="margin-top: 30px; padding: 20px; background: #e3f2fd; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0;">Teacher's Feedback</h3>
            <p style="margin: 0;">${attempt.teacher_feedback}</p>
          </div>
        `;
      }

      html += `
          <div style="margin-top: 40px; text-align: center; color: #999; font-size: 12px;">
            <p>Generated by IGA Prep on ${new Date().toLocaleDateString()}</p>
          </div>
        </div>
      `;

      return html;
    } catch (error) {
      console.error('Error generating results PDF:', error);
      throw error;
    }
  }

  /**
   * Generate certificate PDF
   */
  async generateCertificatePDF(data: {
    studentName: string;
    courseName: string;
    completionDate: string;
    score?: number;
    grade?: string;
  }): Promise<string> {
    const html = `
      <div style="
        font-family: 'Georgia', serif;
        padding: 60px;
        text-align: center;
        border: 3px double #gold;
        background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
        min-height: 600px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      ">
        <div style="font-size: 14px; letter-spacing: 3px; color: #666; margin-bottom: 20px;">
          CERTIFICATE OF COMPLETION
        </div>
        
        <h1 style="
          font-size: 36px;
          color: #2c3e50;
          margin: 20px 0;
          font-weight: normal;
        ">
          ${data.studentName}
        </h1>
        
        <p style="font-size: 18px; color: #666; margin: 20px 0;">
          has successfully completed
        </p>
        
        <h2 style="
          font-size: 28px;
          color: #3498db;
          margin: 20px 0;
          font-weight: normal;
        ">
          ${data.courseName}
        </h2>
        
        ${data.score ? `
          <p style="font-size: 24px; color: #27ae60; margin: 20px 0;">
            Score: ${data.score}% ${data.grade ? `(Grade ${data.grade})` : ''}
          </p>
        ` : ''}
        
        <p style="font-size: 16px; color: #666; margin-top: 40px;">
          Awarded on ${data.completionDate}
        </p>
        
        <div style="margin-top: 60px;">
          <div style="display: inline-block; border-top: 2px solid #333; padding-top: 10px; width: 200px;">
            IGA Prep
          </div>
        </div>
      </div>
    `;

    return html;
  }

  // Helper functions
  private getGrade(percentage: number): string {
    if (percentage >= 90) return 'A*';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'U';
  }

  private formatAnswer(answer: any, question: any): string {
    if (typeof answer === 'string') return answer;
    if (answer.selected_choice_id && question.choices) {
      const choice = question.choices.find((c: any) => c.id === answer.selected_choice_id);
      return choice?.choice_text || 'Unknown';
    }
    if (answer.answer_text) return answer.answer_text;
    return JSON.stringify(answer);
  }

  private getCorrectChoice(question: any): string {
    if (!question.choices) return 'N/A';
    const correct = question.choices.find((c: any) => c.is_correct);
    return correct?.choice_text || 'N/A';
  }
}

export const pdfGenerationService = new PDFGenerationService();
