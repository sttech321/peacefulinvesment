// Email Service Exports

// Core service
export { MailjetService, mailjetService } from './MailjetService';

// Types
export { EmailType, SenderEmail } from './EmailTypes';
export type { 
  EmailRecipient, 
  EmailTemplate, 
  EmailData, 
  EmailAttachment, 
  EmailSendResult
} from './EmailTypes';
export { EMAIL_ROUTING } from './EmailTypes';

// Templates
export { EMAIL_TEMPLATES } from '../../templates/email/EmailTemplates';
export { BASE_EMAIL_TEMPLATE, renderTemplate } from '../../templates/email/BaseTemplate';
export type { TemplateVariables } from '../../templates/email/BaseTemplate';

// Hooks
export { useEmail, emailHelpers } from '../../hooks/useEmail';
export type { UseEmailReturn } from '../../hooks/useEmail';
