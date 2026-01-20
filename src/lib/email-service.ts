/**
 * Email Service for IGA Prep
 * Handles sending emails from different addresses using Resend
 */

import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private baseUrl = 'https://api.resend.com/emails';
  private apiKey: string;

  constructor() {
    // Try multiple environment variable names for the API key
    this.apiKey = process.env.RESEND_API_KEY || 
                 process.env.SMTP_PASSWORD || 
                 process.env.RESEND_API_TOKEN || '';
    
    console.log('Email Service Debug:');
    console.log('- RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('- SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD);
    console.log('- Final API key set:', !!this.apiKey);
    
    if (!this.apiKey) {
      console.warn('Email service: No API key found. Set RESEND_API_KEY or SMTP_PASSWORD in your environment variables.');
    }
  }

  /**
   * Send an email using the Resend API
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    if (!this.apiKey) {
      return { success: false, error: 'Email service not configured' };
    }

    const from = options.from || process.env.SMTP_FROM_EMAIL || 'noreply@igaprep.com';
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `IGA Prep <${from}>`,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
          replyTo: options.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Failed to send email' };
      }

      return { success: true };
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: 'Failed to send email' };
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(to: string, userName: string): Promise<{ success: boolean; error?: string }> {
    const template: EmailTemplate = {
      subject: 'Welcome to IGA Prep!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Welcome to IGA Prep, ${userName}!</h2>
          <p>Thank you for joining IGA Prep. We're excited to help you succeed in your exams!</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Getting Started:</h3>
            <ul>
              <li>Complete your profile setup</li>
              <li>Choose your subjects and exam boards</li>
              <li>Start practicing with our interactive assessments</li>
            </ul>
          </div>
          <p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Get Started
            </a>
          </p>
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            If you have any questions, reply to this email or contact us at support@igaprep.com
          </p>
        </div>
      `,
      text: `Welcome to IGA Prep, ${userName}! Thank you for joining. Get started at ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    };

    return this.sendEmail({
      to,
      from: process.env.SMTP_FROM_EMAIL,
      ...template,
    });
  }

  /**
   * Send support email response
   */
  async sendSupportResponse(to: string, subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    const template: EmailTemplate = {
      subject: `Re: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">IGA Prep Support</h2>
          <p>Hi there,</p>
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            This is a response from our support team. If you need further assistance, 
            please reply to this email or visit our help center.
          </p>
        </div>
      `,
      text: `IGA Prep Support Response:\n\n${message}`,
    };

    return this.sendEmail({
      to,
      from: process.env.SUPPORT_EMAIL,
      replyTo: process.env.SUPPORT_EMAIL,
      ...template,
    });
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(subject: string, message: string): Promise<{ success: boolean; error?: string }> {
    const template: EmailTemplate = {
      subject: `[IGA Prep Admin] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Admin Notification</h2>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #64748b; font-size: 14px;">
            This is an automated admin notification from IGA Prep.
          </p>
        </div>
      `,
      text: `Admin Notification: ${subject}\n\n${message}`,
    };

    return this.sendEmail({
      to: process.env.ADMIN_EMAIL || 'admin@igaprep.com',
      from: process.env.ADMIN_EMAIL || 'admin@igaprep.com',
      ...template,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(to: string, resetLink: string): Promise<{ success: boolean; error?: string }> {
    const template: EmailTemplate = {
      subject: 'Reset your IGA Prep password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>We received a request to reset your password for your IGA Prep account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p style="color: #64748b; font-size: 14px;">
            If you didn't request this password reset, you can safely ignore this email. 
            This link will expire in 1 hour.
          </p>
          <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
            If you're having trouble, contact us at support@igaprep.com
          </p>
        </div>
      `,
      text: `Reset your IGA Prep password: ${resetLink}\n\nThis link will expire in 1 hour.`,
    };

    return this.sendEmail({
      to,
      from: process.env.SMTP_FROM_EMAIL,
      ...template,
    });
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export types for use in components
export type { EmailOptions, EmailTemplate };
