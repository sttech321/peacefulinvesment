import { EmailData, EmailSendResult, EmailType, EMAIL_ROUTING } from './EmailTypes';
import { emailConfig, getMailjetCredentials, validateEmailConfig } from '../../config/email';

// Use dynamic import to handle ES module compatibility
let MailjetClient: any = null;

async function getMailjetClient() {
  if (!MailjetClient) {
    const mailjet = await import('node-mailjet');
    MailjetClient = mailjet.Client;
  }
  return MailjetClient;
}

export class MailjetService {
  private mailjet: any;
  private apiKey: string;
  private secretKey: string;
  private initialized: boolean = false;

  constructor() {
    // Validate configuration
    if (!validateEmailConfig()) {
      throw new Error('Invalid email configuration. Please check your environment variables.');
    }

    // Get API credentials
    const { apiKey, secretKey } = getMailjetCredentials();
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  private async initialize() {
    if (!this.initialized) {
      const Mailjet = await getMailjetClient();
      this.mailjet = new Mailjet({
        apiKey: this.apiKey,
        apiSecret: this.secretKey,
      });
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
      
      const emailPayload = {
        Messages: [
          {
            From: {
              Email: routing.sender,
              Name: routing.senderName,
            },
            To: [
              {
                Email: emailData.recipient.email,
                Name: emailData.recipient.name || emailData.recipient.email,
              },
            ],
            Subject: emailData.template.subject,
            HTMLPart: emailData.template.htmlContent,
            TextPart: emailData.template.textContent || this.stripHtml(emailData.template.htmlContent),
            CustomID: emailData.type,
            ...(emailData.attachments && {
              Attachments: emailData.attachments.map(attachment => ({
                ContentType: attachment.contentType,
                Filename: attachment.filename,
                Base64Content: Buffer.from(attachment.content).toString('base64'),
              })),
            }),
          },
        ],
      };

      const result = await this.mailjet.post('send', { version: 'v3.1' }).request(emailPayload);
      
      if (result.body.Messages && result.body.Messages[0].Status === 'success') {
        return {
          success: true,
          messageId: result.body.Messages[0].To[0].MessageID,
        };
      } else {
        return {
          success: false,
          error: result.body.Messages?.[0]?.Errors?.[0]?.ErrorMessage || 'Unknown error',
        };
      }
    } catch (error) {
      console.error('Mailjet send error:', error);
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
    
    // Process emails in batches of 50 (Mailjet limit)
    const batchSize = 50;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(email => this.sendEmail(email))
      );
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Get email statistics
   */
  async getEmailStats(messageId?: string) {
    try {
      await this.initialize();
      const endpoint = messageId 
        ? `message/${messageId}`
        : 'message';
      
      const result = await this.mailjet.get(endpoint, { version: 'v3' }).request();
      return result.body;
    } catch (error) {
      console.error('Mailjet stats error:', error);
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
      // Try to get account information
      const result = await this.mailjet.get('account', { version: 'v3' }).request();
      return !!result.body;
    } catch (error) {
      console.error('Mailjet connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const mailjetService = new MailjetService();
