/**
 * Email Service
 * Queue-based email notification system
 */

import { createClient } from '@/lib/supabase/client';

export interface EmailData {
  to_email: string;
  to_name?: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_id?: string;
  template_data?: Record<string, any>;
  priority?: number;
  scheduled_for?: string;
  metadata?: Record<string, any>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  variables: string[];
  is_active: boolean;
}

export class EmailService {
  private supabase = createClient();

  /**
   * Queue an email for sending
   */
  async queueEmail(data: EmailData): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('email_queue')
        .insert({
          to_email: data.to_email,
          to_name: data.to_name,
          subject: data.subject,
          html_content: data.html_content,
          text_content: data.text_content,
          template_id: data.template_id,
          template_data: data.template_data,
          priority: data.priority || 5,
          scheduled_for: data.scheduled_for,
          metadata: data.metadata || {}
        });

      if (error) {
        console.error('Error queuing email:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in queueEmail:', error);
      return false;
    }
  }

  /**
   * Send email using template
   */
  async sendTemplateEmail(
    templateName: string,
    to_email: string,
    to_name: string,
    variables: Record<string, any>,
    priority?: number
  ): Promise<boolean> {
    try {
      // Fetch template
      const { data: template, error: templateError } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('name', templateName)
        .eq('is_active', true)
        .single();

      if (templateError || !template) {
        console.error('Template not found:', templateName);
        return false;
      }

      // Replace variables in template
      let subject = template.subject;
      let htmlContent = template.html_content;
      let textContent = template.text_content || '';

      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), String(value));
        textContent = textContent.replace(new RegExp(placeholder, 'g'), String(value));
      }

      return await this.queueEmail({
        to_email,
        to_name,
        subject,
        html_content: htmlContent,
        text_content: textContent,
        template_id: template.id,
        template_data: variables,
        priority
      });
    } catch (error) {
      console.error('Error sending template email:', error);
      return false;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    return this.sendTemplateEmail('welcome', email, name, { name }, 3);
  }

  /**
   * Send assignment due reminder
   */
  async sendAssignmentDueReminder(
    email: string,
    studentName: string,
    assignmentTitle: string,
    dueDate: string
  ): Promise<boolean> {
    return this.sendTemplateEmail('assignment_due', email, studentName, {
      student_name: studentName,
      assignment_title: assignmentTitle,
      due_date: dueDate
    }, 2);
  }

  /**
   * Send grade released notification
   */
  async sendGradeReleasedEmail(
    email: string,
    studentName: string,
    testTitle: string,
    score: number
  ): Promise<boolean> {
    return this.sendTemplateEmail('grade_released', email, studentName, {
      student_name: studentName,
      test_title: testTitle,
      score: score.toString()
    }, 3);
  }

  /**
   * Send new message notification
   */
  async sendNewMessageEmail(
    email: string,
    recipientName: string,
    senderName: string,
    messagePreview: string
  ): Promise<boolean> {
    return this.sendTemplateEmail('new_message', email, recipientName, {
      recipient_name: recipientName,
      sender_name: senderName,
      message_preview: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : '')
    }, 5);
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(emails: EmailData[]): Promise<number> {
    let successCount = 0;

    for (const email of emails) {
      const success = await this.queueEmail(email);
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Send batch template emails to multiple recipients
   */
  async sendBatchTemplateEmails(
    templateName: string,
    recipients: { email: string; name: string; variables: Record<string, any> }[]
  ): Promise<number> {
    let successCount = 0;

    for (const recipient of recipients) {
      const success = await this.sendTemplateEmail(
        templateName,
        recipient.email,
        recipient.name,
        recipient.variables
      );
      if (success) successCount++;
    }

    return successCount;
  }

  /**
   * Get available email templates
   */
  async getTemplates(): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await this.supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching templates:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTemplates:', error);
      return [];
    }
  }

  /**
   * Schedule assignment due reminders for a class
   */
  async scheduleAssignmentReminders(
    assignmentId: string,
    reminderTime: string
  ): Promise<boolean> {
    try {
      // Fetch assignment with class students
      const { data: assignment, error: assignmentError } = await this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(
            id,
            enrollments(
              student:users(id, email, display_name)
            )
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (assignmentError || !assignment) {
        console.error('Assignment not found');
        return false;
      }

      const students = assignment.class?.enrollments?.map((e: any) => e.student) || [];
      const dueDate = assignment.due_at 
        ? new Date(assignment.due_at).toLocaleDateString() 
        : 'TBD';

      for (const student of students) {
        if (student?.email) {
          await this.queueEmail({
            to_email: student.email,
            to_name: student.display_name,
            subject: `Reminder: ${assignment.title} due soon`,
            html_content: `
              <h1>Assignment Reminder</h1>
              <p>Hi ${student.display_name},</p>
              <p>This is a reminder that <strong>${assignment.title}</strong> is due on ${dueDate}.</p>
              <p>Don't forget to complete and submit your work!</p>
            `,
            text_content: `Reminder: ${assignment.title} is due on ${dueDate}`,
            priority: 2,
            scheduled_for: reminderTime,
            metadata: { assignment_id: assignmentId, type: 'due_reminder' }
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error scheduling reminders:', error);
      return false;
    }
  }

  /**
   * Notify class about new assignment
   */
  async notifyClassAboutAssignment(assignmentId: string): Promise<boolean> {
    try {
      const { data: assignment, error } = await this.supabase
        .from('assignments')
        .select(`
          *,
          class:classes(
            id,
            name,
            enrollments(
              student:users(id, email, display_name)
            )
          ),
          assessment:assessments(title)
        `)
        .eq('id', assignmentId)
        .single();

      if (error || !assignment) {
        console.error('Assignment not found');
        return false;
      }

      const students = assignment.class?.enrollments?.map((e: any) => e.student) || [];
      const testTitle = assignment.assessment?.title || assignment.title;
      const dueDate = assignment.due_at 
        ? new Date(assignment.due_at).toLocaleDateString() 
        : 'No due date';

      for (const student of students) {
        if (student?.email) {
          await this.queueEmail({
            to_email: student.email,
            to_name: student.display_name,
            subject: `New Assignment: ${testTitle}`,
            html_content: `
              <h1>New Assignment</h1>
              <p>Hi ${student.display_name},</p>
              <p>A new assignment has been posted: <strong>${testTitle}</strong></p>
              <p><strong>Class:</strong> ${assignment.class?.name}</p>
              <p><strong>Due:</strong> ${dueDate}</p>
              ${assignment.instructions ? `<p><strong>Instructions:</strong> ${assignment.instructions}</p>` : ''}
              <p>Log in to IGCSE Simplified to get started!</p>
            `,
            text_content: `New assignment: ${testTitle}. Due: ${dueDate}`,
            priority: 3,
            metadata: { assignment_id: assignmentId, type: 'new_assignment' }
          });
        }
      }

      return true;
    } catch (error) {
      console.error('Error notifying class:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
