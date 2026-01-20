export interface EmailAccount {
  id: string;
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  provider: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
}

export interface EmailReply {
  id: string;
  body: string;
  created_at: string;
}

export interface EmailAttachment {
  part: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  subject: string | null;
  from_email: string;
  body_text: string | null;
  body_html: string | null;
  date_received: string;
  is_read: boolean;
  email_account?: EmailAccount;
  attachments?: EmailAttachment[];
  replies?: EmailReply[];
}

