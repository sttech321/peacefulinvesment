import { EmailData, EmailSendResult, EmailType, EMAIL_ROUTING } from './EmailTypes';
import { emailConfig, getResendApiKey, validateEmailConfig } from '../../config/email';

// Use dynamic import to handle ES module compatibility
let ResendClient: any = null;

async function getResendClient() {
  if (!ResendClient) {
    const { Resend } = await import('resend');
    ResendClient = Resend;
  }
  return ResendClient;
}

export class ResendService {
  private resend: any;
  private apiKey: string;
  private initialized: boolean = false;

  constructor() {
    // Validate configuration
    if (!validateEmailConfig()) {
      throw new Error('Invalid email configuration. Please check your environment variables.');
    }

    // Get API key
    this.apiKey = getResendApiKey();
  }

  private async initialize() {
    if (!this.initialized) {
      const Resend = await getResendClient();
      this.resend = new Resend(this.apiKey);
      this.initialized = true;
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(emailData: EmailData): Promise<EmailSendResult> {
    try {
      await this.initialize();
      const routing = EMAIL_ROUTING[emailData.type];
      
      // Resend uses a different structure than Mailjet
      // Handle both recipient (used by MailjetService) and to array (from EmailData type)
      const recipient = (emailData as any).recipient || (emailData.to && emailData.to[0]);
      if (!recipient) {
        return {
          success: false,
          error: 'No recipient specified',
        };
      }

      // Get template from emailData (template property is added by useEmail hook)
      const template = (emailData as any).template;
      if (!template) {
        return {
          success: false,
          error: 'No email template provided',
        };
      }

      // Map sender email to sender name
      const senderNameMap: Record<string, string> = {
        [emailConfig.defaultSender.support]: 'Peaceful Investment Support',
        [emailConfig.defaultSender.admin]: 'Peaceful Investment Admin',
        [emailConfig.defaultSender.info]: 'Peaceful Investment',
        [emailConfig.defaultSender.noreply]: 'Peaceful Investment',
        'security@peacefulinvestment.com': 'Peaceful Investment Security',
      };

      // Format recipient with name if available
      const toRecipient = recipient.name 
        ? `${recipient.name} <${recipient.email}>`
        : recipient.email;

      // Always include text version for better deliverability
      const textContent = template.textContent || this.stripHtml(template.htmlContent);

      // Set appropriate reply-to address
      const replyToEmail = emailData.replyTo || routing;

      // Determine if this email type should include unsubscribe link
      const transactionalEmails = [
        EmailType.EMAIL_VERIFICATION,
        EmailType.PASSWORD_RESET,
        EmailType.ACCOUNT_VERIFICATION,
        EmailType.DEPOSIT_CONFIRMATION,
        EmailType.WITHDRAWAL_CONFIRMATION,
        EmailType.ACCOUNT_APPROVED,
        EmailType.ACCOUNT_REJECTED,
      ];
      const isTransactional = transactionalEmails.includes(emailData.type);

      const emailPayload: any = {
        from: `${senderNameMap[routing] || 'Peaceful Investment'} <${routing}>`,
        to: [toRecipient],
        subject: template.subject,
        html: template.htmlContent,
        text: textContent, // Always include text version
        reply_to: replyToEmail, // Always set reply-to
        // Add headers for better deliverability
        headers: {
          'X-Entity-Ref-ID': `${emailData.type}-${Date.now()}`,
          // For transactional emails (password reset, verification), don't include unsubscribe
          // as they are required communications
          ...(!isTransactional && {
            'List-Unsubscribe': `<https://peacefulinvestment.com/unsubscribe?email=${encodeURIComponent(recipient.email)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }),
          // Add Precedence header for transactional emails to reduce spam filtering
          ...(isTransactional && {
            'Precedence': 'bulk',
            'Auto-Submitted': 'auto-generated',
          }),
          // Add Message-ID for better tracking and deliverability
          'Message-ID': `<${emailData.type}-${Date.now()}-${Math.random().toString(36).substring(7)}@peacefulinvestment.com>`,
        },
        // Add metadata for tracking and categorization
        tags: [
          { name: 'email-type', value: emailData.type },
          ...(emailData.tags ? emailData.tags.map(tag => ({ name: tag, value: emailData.type })) : []),
        ],
      };

      // Handle CC and BCC if provided
      if (emailData.cc && emailData.cc.length > 0) {
        emailPayload.cc = emailData.cc.map(r => r.email);
      }
      if (emailData.bcc && emailData.bcc.length > 0) {
        emailPayload.bcc = emailData.bcc.map(r => r.email);
      }

      // Handle attachments
      if (emailData.attachments && emailData.attachments.length > 0) {
        emailPayload.attachments = emailData.attachments.map(attachment => ({
          filename: attachment.filename,
          content: Buffer.from(attachment.content, 'base64'),
          contentType: attachment.contentType,
        }));
      }

      // Note: X-Priority header is already set above for transactional emails
      // Only override if explicitly specified by user
      if (emailData.priority && !isTransactional) {
        emailPayload.headers = {
          ...emailPayload.headers,
          'X-Priority': emailData.priority === 'high' ? '1' : emailData.priority === 'low' ? '5' : '3',
        };
      }

      const result = await this.resend.emails.send(emailPayload);
      
      if (result.data && result.data.id) {
        return {
          success: true,
          messageId: result.data.id,
        };
      } else if (result.error) {
        return {
          success: false,
          error: result.error.message || 'Unknown error from Resend',
          details: result.error,
        };
      } else {
        return {
          success: false,
          error: 'Unknown error',
        };
      }
    } catch (error) {
      console.error('Resend send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send multiple emails in batch
   */
  async sendBulkEmails(emails: EmailData[]): Promise<EmailSendResult[]> {
    const results: EmailSendResult[] = [];
    
    // Process emails sequentially to avoid rate limits
    // Resend recommends sending in batches if needed
    for (const email of emails) {
      const result = await this.sendEmail(email);
      results.push(result);
      
      // Small delay to respect rate limits (100 emails per second free tier)
      if (emails.length > 10) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    return results;
  }

  /**
   * Get email statistics
   * Note: Resend API v1 doesn't have a direct stats endpoint
   * This would require using Resend's dashboard or webhook events
   */
  async getEmailStats(messageId?: string) {
    try {
      await this.initialize();
      if (messageId) {
        // Resend doesn't have a get email endpoint in the SDK
        // You would need to use webhooks or the Resend dashboard
        throw new Error('Resend does not support retrieving email stats via API. Use webhooks instead.');
      }
      return null;
    } catch (error) {
      console.error('Resend stats error:', error);
      throw error;
    }
  }

  /**
   * Validate email address
   */
  async validateEmail(email: string): Promise<boolean> {
    try {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return false;
      }

      // You can add more sophisticated validation here
      // For now, return true if basic regex passes
      return true;
    } catch (error) {
      console.error('Email validation error:', error);
      return false;
    }
  }

  /**
   * Get template by email type
   */
  getTemplateByType(type: EmailType): string {
    // This will be implemented with actual templates
    return `Template for ${type}`;
  }

  /**
   * Strip HTML tags from content for text version
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.initialize();
      // Try to send a test email or check API key validity
      // For Resend, we can try to list domains as a test
      // But the simplest test is to just check if client initialized
      return !!this.resend;
    } catch (error) {
      console.error('Resend connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const resendService = new ResendService();

