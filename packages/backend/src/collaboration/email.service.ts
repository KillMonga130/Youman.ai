/**
 * Email Service
 * Handles sending email notifications for collaboration features
 * Requirements: 21.1 - Send invitation email with secure access link
 */

import nodemailer from 'nodemailer';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import type { EmailOptions } from './types';

// ============================================
// Email Configuration
// ============================================

/**
 * Create email transporter based on environment
 */
function createTransporter(): nodemailer.Transporter {
  // In test/development, use a mock transporter or ethereal
  if (config.isTest) {
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
      ignoreTLS: true,
    });
  }

  // In development without SMTP config, use ethereal test account
  if (config.isDevelopment && !process.env.SMTP_HOST) {
    logger.info('Using ethereal email for development');
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: process.env.ETHEREAL_USER || 'test@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'testpass',
      },
    });
  }

  // Production SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

let transporter: nodemailer.Transporter | null = null;

/**
 * Get or create email transporter
 */
function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

// ============================================
// Email Sending Functions
// ============================================

/**
 * Send an email
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || '"AI Humanizer" <noreply@aihumanizer.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || stripHtml(options.html),
    };

    const info = await transport.sendMail(mailOptions);
    
    logger.info('Email sent successfully', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    // In development, log the preview URL if using ethereal
    if (config.isDevelopment && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info('Preview URL:', { url: previewUrl });
      }
    }

    return true;
  } catch (error) {
    logger.error('Failed to send email', {
      error: error instanceof Error ? error.message : 'Unknown error',
      to: options.to,
      subject: options.subject,
    });
    return false;
  }
}

/**
 * Send collaboration invitation email
 * Requirements: 21.1 - Send invitation email with secure access link
 */
export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  role: string;
  invitationToken: string;
  message?: string | undefined;
  expiresAt: Date;
}): Promise<boolean> {
  const { to, inviterName, projectName, role, invitationToken, message, expiresAt } = params;
  
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const acceptUrl = `${baseUrl}/invitations/accept?token=${invitationToken}`;
  const expiresFormatted = expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Project Invitation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">AI Humanizer</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">You've been invited to collaborate!</h2>
        
        <p><strong>${inviterName}</strong> has invited you to collaborate on the project <strong>"${projectName}"</strong> as a <strong>${role.toLowerCase()}</strong>.</p>
        
        ${message ? `
        <div style="background: #fff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;">
          <p style="margin: 0; font-style: italic;">"${message}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${acceptUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This invitation will expire on <strong>${expiresFormatted}</strong>.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          If you can't click the button above, copy and paste this link into your browser:
          <br>
          <a href="${acceptUrl}" style="color: #667eea; word-break: break-all;">${acceptUrl}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          If you didn't expect this invitation, you can safely ignore this email.
          <br>
          © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${inviterName} invited you to collaborate on "${projectName}"`,
    html,
  });
}

/**
 * Send notification when invitation is accepted
 */
export async function sendInvitationAcceptedEmail(params: {
  to: string;
  accepterName: string;
  accepterEmail: string;
  projectName: string;
}): Promise<boolean> {
  const { to, accepterName, accepterEmail, projectName } = params;
  
  const displayName = accepterName || accepterEmail;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invitation Accepted</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0;">AI Humanizer</h1>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
        <h2 style="color: #333; margin-top: 0;">Invitation Accepted! 🎉</h2>
        
        <p><strong>${displayName}</strong> has accepted your invitation to collaborate on <strong>"${projectName}"</strong>.</p>
        
        <p>They now have access to the project and can start collaborating with you.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} AI Humanizer. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${displayName} accepted your invitation to "${projectName}"`,
    html,
  });
}

// ============================================
// Helper Functions
// ============================================

/**
 * Strip HTML tags from string for plain text version
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*<\/style>/gi, '')
    .replace(/<script[^>]*>.*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Close email transporter (for cleanup)
 */
export function closeTransporter(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
