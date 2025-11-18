import { useState, useCallback } from 'react';
import { EmailData, EmailSendResult, EmailType, EmailRecipient } from '../services/email/EmailTypes';
import { mailjetService } from '../services/email/MailjetService';
import { EMAIL_TEMPLATES } from '../templates/email/EmailTemplates';

export interface UseEmailReturn {
  sendEmail: (data: Omit<EmailData, 'template'> & { variables?: Record<string, any> }) => Promise<EmailSendResult>;
  sendBulkEmails: (emails: Array<Omit<EmailData, 'template'> & { variables?: Record<string, any> }>) => Promise<EmailSendResult[]>;
  isSending: boolean;
  error: string | null;
  testConnection: () => Promise<boolean>;
}

export function useEmail(): UseEmailReturn {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = useCallback(async (data: Omit<EmailData, 'template'> & { variables?: Record<string, any> }): Promise<EmailSendResult> => {
    setIsSending(true);
    setError(null);

    try {
      // Get the base template
      const baseTemplate = EMAIL_TEMPLATES[data.type];
      
      // Replace variables in the template
      let htmlContent = baseTemplate.htmlContent;
      let subject = baseTemplate.subject;
      
      if (data.variables) {
        // Replace variables in HTML content
        Object.keys(data.variables).forEach(key => {
          const placeholder = `{{${key}}}`;
          htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), data.variables![key]);
          subject = subject.replace(new RegExp(placeholder, 'g'), data.variables![key]);
        });
      }

      // Create the email data
      const emailData: EmailData = {
        ...data,
        template: {
          ...baseTemplate,
          htmlContent,
          subject,
        },
      };

      const result = await mailjetService.sendEmail(emailData);
      
      if (!result.success) {
        setError(result.error || 'Failed to send email');
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsSending(false);
    }
  }, []);

  const sendBulkEmails = useCallback(async (emails: Array<Omit<EmailData, 'template'> & { variables?: Record<string, any> }>): Promise<EmailSendResult[]> => {
    setIsSending(true);
    setError(null);

    try {
      const emailDataList: EmailData[] = emails.map(data => {
        const baseTemplate = EMAIL_TEMPLATES[data.type];
        
        let htmlContent = baseTemplate.htmlContent;
        let subject = baseTemplate.subject;
        
        if (data.variables) {
          Object.keys(data.variables).forEach(key => {
            const placeholder = `{{${key}}}`;
            htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), data.variables![key]);
            subject = subject.replace(new RegExp(placeholder, 'g'), data.variables![key]);
          });
        }

        return {
          ...data,
          template: {
            ...baseTemplate,
            htmlContent,
            subject,
          },
        };
      });

      const results = await mailjetService.sendBulkEmails(emailDataList);
      
      const hasErrors = results.some(result => !result.success);
      if (hasErrors) {
        setError('Some emails failed to send');
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      return emails.map(() => ({ success: false, error: errorMessage }));
    } finally {
      setIsSending(false);
    }
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      return await mailjetService.testConnection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
      return false;
    }
  }, []);

  return {
    sendEmail,
    sendBulkEmails,
    isSending,
    error,
    testConnection,
  };
}

// Helper functions for common email operations
export const emailHelpers = {
  /**
   * Send email verification
   */
  sendEmailVerification: async (
    recipient: EmailRecipient,
    verificationLink: string
  ) => {
    const { sendEmail } = useEmail();
    return sendEmail({
      type: EmailType.EMAIL_VERIFICATION,
      recipient,
      variables: { verificationLink },
    });
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (
    recipient: EmailRecipient,
    resetLink: string
  ) => {
    const { sendEmail } = useEmail();
    return sendEmail({
      type: EmailType.PASSWORD_RESET,
      recipient,
      variables: { resetLink },
    });
  },

  /**
   * Send welcome email
   */
  sendWelcomeEmail: async (
    recipient: EmailRecipient,
    userName: string,
    dashboardLink: string
  ) => {
    const { sendEmail } = useEmail();
    return sendEmail({
      type: EmailType.WELCOME,
      recipient,
      variables: { userName, dashboardLink },
    });
  },

  /**
   * Send support request confirmation
   */
  sendSupportRequest: async (
    recipient: EmailRecipient,
    ticketId: string,
    subject: string,
    message: string,
    priority: string
  ) => {
    const { sendEmail } = useEmail();
    return sendEmail({
      type: EmailType.SUPPORT_REQUEST,
      recipient,
      variables: { 
        userName: recipient.name || recipient.email,
        ticketId,
        subject,
        message,
        priority,
      },
    });
  },

  /**
   * Send referral invitation
   */
  sendReferralInvitation: async (
    recipient: EmailRecipient,
    inviterName: string,
    invitationLink: string,
    bonusAmount: string
  ) => {
    const { sendEmail } = useEmail();
    return sendEmail({
      type: EmailType.REFERRAL_INVITATION,
      recipient,
      variables: { 
        recipientName: recipient.name || recipient.email,
        inviterName,
        invitationLink,
        bonusAmount,
      },
    });
  },
};

