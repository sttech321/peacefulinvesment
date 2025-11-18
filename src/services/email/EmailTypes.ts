// Email service types and configurations

// Email types enum
export enum EmailType {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
  ACCOUNT_VERIFICATION = 'account_verification',
  SUPPORT_REQUEST = 'support_request',
  CONTACT_FORM = 'contact_form',
  REFERRAL_INVITATION = 'referral_invitation',
  COMMISSION_NOTIFICATION = 'commission_notification',
  DEPOSIT_CONFIRMATION = 'deposit_confirmation',
  WITHDRAWAL_CONFIRMATION = 'withdrawal_confirmation',
  ACCOUNT_APPROVED = 'account_approved',
  ACCOUNT_REJECTED = 'account_rejected',
  DOCUMENT_REQUEST = 'document_request',
  MAINTENANCE_NOTIFICATION = 'maintenance_notification',
  SECURITY_ALERT = 'security_alert'
}

// Sender email addresses enum
export enum SenderEmail {
  SUPPORT = 'support@peacefulinvestment.com',
  ADMIN = 'admin@peacefulinvestment.com',
  INFO = 'info@peacefulinvestment.com',
  NOREPLY = 'noreply@peacefulinvestment.com',
  SECURITY = 'security@peacefulinvestment.com'
}

// Email routing configuration - maps email types to sender addresses
export const EMAIL_ROUTING: Record<EmailType, SenderEmail> = {
  [EmailType.WELCOME]: SenderEmail.SUPPORT,
  [EmailType.PASSWORD_RESET]: SenderEmail.SECURITY,
  [EmailType.EMAIL_VERIFICATION]: SenderEmail.SECURITY,
  [EmailType.ACCOUNT_VERIFICATION]: SenderEmail.ADMIN,
  [EmailType.SUPPORT_REQUEST]: SenderEmail.SUPPORT,
  [EmailType.CONTACT_FORM]: SenderEmail.INFO,
  [EmailType.REFERRAL_INVITATION]: SenderEmail.INFO,
  [EmailType.COMMISSION_NOTIFICATION]: SenderEmail.ADMIN,
  [EmailType.DEPOSIT_CONFIRMATION]: SenderEmail.SUPPORT,
  [EmailType.WITHDRAWAL_CONFIRMATION]: SenderEmail.SUPPORT,
  [EmailType.ACCOUNT_APPROVED]: SenderEmail.ADMIN,
  [EmailType.ACCOUNT_REJECTED]: SenderEmail.ADMIN,
  [EmailType.DOCUMENT_REQUEST]: SenderEmail.ADMIN,
  [EmailType.MAINTENANCE_NOTIFICATION]: SenderEmail.INFO,
  [EmailType.SECURITY_ALERT]: SenderEmail.SECURITY
};

// Email recipient interface
export interface EmailRecipient {
  email: string;
  name?: string;
}

// Email template interface
export interface EmailTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

// Email attachment interface
export interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded content
  contentType: string;
}

// Email data interface for sending
export interface EmailData {
  type: EmailType;
  to: EmailRecipient[];
  cc?: EmailRecipient[];
  bcc?: EmailRecipient[];
  subject?: string; // Override default subject
  templateVariables?: Record<string, any>;
  attachments?: EmailAttachment[];
  customSender?: SenderEmail; // Override default sender
  replyTo?: string;
  priority?: 'low' | 'normal' | 'high';
  tags?: string[];
}

// Email send result interface
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: any;
}

// Email template variables for common use cases
export interface CommonTemplateVariables {
  userName?: string;
  userEmail?: string;
  companyName?: string;
  supportEmail?: string;
  websiteUrl?: string;
  loginUrl?: string;
  resetUrl?: string;
  verificationUrl?: string;
  documentUrl?: string;
  amount?: number;
  currency?: string;
  transactionId?: string;
  referralCode?: string;
  commissionAmount?: number;
  currentDate?: string;
  expirationDate?: string;
  reason?: string;
  message?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactSubject?: string;
  contactMessage?: string;
}

// Email queue status
export enum EmailQueueStatus {
  PENDING = 'pending',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Email queue item interface
export interface EmailQueueItem {
  id: string;
  emailData: EmailData;
  status: EmailQueueStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
  sentAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Email service configuration
export interface EmailServiceConfig {
  apiKey: string;
  apiSecret?: string;
  apiRegion?: string;
  fromName?: string;
  replyToEmail?: string;
  enableQueue?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableTracking?: boolean;
  enableAnalytics?: boolean;
  testMode?: boolean;
}

// Email analytics data
export interface EmailAnalytics {
  messageId: string;
  emailType: EmailType;
  recipient: string;
  status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Email template categories
export enum EmailCategory {
  AUTHENTICATION = 'authentication',
  NOTIFICATIONS = 'notifications',
  MARKETING = 'marketing',
  TRANSACTIONAL = 'transactional',
  SYSTEM = 'system',
  SUPPORT = 'support'
}

// Email template metadata
export interface EmailTemplateMetadata {
  category: EmailCategory;
  description: string;
  requiredVariables: string[];
  optionalVariables?: string[];
  tags?: string[];
  version?: string;
  lastUpdated?: Date;
}

// Bulk email operation interface
export interface BulkEmailOperation {
  id: string;
  emails: EmailData[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    sent: number;
    failed: number;
    pending: number;
  };
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

// Email validation result
export interface EmailValidationResult {
  isValid: boolean;
  email: string;
  errors: string[];
  suggestions?: string[];
}

