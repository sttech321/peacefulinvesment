import { EmailType, EmailTemplate } from '../../services/email/EmailTypes';
import { BASE_EMAIL_TEMPLATE, renderTemplate } from './BaseTemplate';

export const EMAIL_TEMPLATES: Record<EmailType, EmailTemplate> = {
  // Authentication Templates
  [EmailType.EMAIL_VERIFICATION]: {
    subject: 'Verify Your Email Address - Peaceful Investment',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Verify Your Email Address',
      content: `
        <h2>Welcome to Peaceful Investment!</h2>
        <p>Thank you for creating your account. We're excited to have you join our community of smart investors.</p>
        
        <p>To complete your registration and start your investment journey, please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{verificationLink}}" class="button">Verify Email Address</a>
        </div>
        
        <div class="info-box" style="background-color: #eff6ff; border-left-color: #2563eb;">
          <p style="color: #1e40af;"><strong>Important:</strong> This verification link will expire in 24 hours. If you don't verify your email, your account will remain inactive.</p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #2563eb; font-size: 14px;">{{verificationLink}}</p>
        
        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 30px 0;">
          <p style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 12px 0;">What's next after verification?</p>
          <ul style="color: #4b5563; font-size: 14px; margin: 0; padding-left: 20px; line-height: 1.8;">
            <li>Complete your profile setup</li>
            <li>Explore investment opportunities</li>
            <li>Set up your trading preferences</li>
            <li>Start your investment journey</li>
          </ul>
        </div>
        
        <div class="divider"></div>
        
        <p style="color: #6b7280; font-size: 14px;"><strong>Didn't create an account?</strong></p>
        <p style="color: #6b7280; font-size: 14px;">If you didn't create an account with Peaceful Investment, please ignore this email. No account will be created without email verification.</p>
      `
    })
  },

  [EmailType.PASSWORD_RESET]: {
    subject: 'Reset Your Password - Peaceful Investment',
    senderEmail: 'security@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Security',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Password Reset Request',
      content: `
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password for your Peaceful Investment account. If you made this request, click the button below to reset your password.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{resetLink}}" class="button">Reset Password</a>
        </div>
        
        <div class="info-box">
          <p><strong>Security Notice:</strong> This link will expire in 1 hour for your security. If you didn't request this reset, please ignore this email and consider changing your password.</p>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #FFD700;">{{resetLink}}</p>
        
        <div class="divider"></div>
      `
    })
  },

  // Welcome Template
  [EmailType.WELCOME]: {
    subject: 'Welcome to Peaceful Investment!',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Team',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Welcome to Peaceful Investment!',
      content: `
        <h2>Welcome to Your Investment Journey!</h2>
        <p>Dear {{userName}},</p>
        
        <p>Congratulations on joining Peaceful Investment! We're excited to have you as part of our community of smart investors.</p>
        
        <p>Your account has been successfully created and verified. Here's what you can do next:</p>
        
        <ul style="color: #6b7280; line-height: 1.8;">
          <li>Complete your profile setup</li>
          <li>Explore our investment opportunities</li>
          <li>Set up your trading preferences</li>
          <li>Invite friends and earn referral bonuses</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{dashboardLink}}" class="button">Go to Dashboard</a>
        </div>
        
        <div class="info-box">
          <p><strong>Need Help?</strong> Our support team is here to assist you 24/7. Don't hesitate to reach out if you have any questions about your account or our services.</p>
        </div>
        
        <p>Thank you for choosing Peaceful Investment for your financial journey!</p>
        <p><strong>The Peaceful Investment Team</strong></p>
      `
    })
  },

  // Support Templates
  [EmailType.SUPPORT_REQUEST]: {
    subject: 'Support Request Received - Peaceful Investment',
    senderEmail: 'support@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Support',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Support Request Received',
      content: `
        <h2>Support Request Received</h2>
        <p>Dear {{userName}},</p>
        
        <p>We've received your support request and our team is working on it. Here are the details:</p>
        
        <div class="info-box">
          <p><strong>Ticket ID:</strong> {{ticketId}}</p>
          <p><strong>Subject:</strong> {{subject}}</p>
          <p><strong>Priority:</strong> {{priority}}</p>
        </div>
        
        <p><strong>Your Message:</strong></p>
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p style="margin: 0; color: #374151;">{{message}}</p>
        </div>
        
        <p>We'll get back to you within 24 hours during business days.</p>
        
        <div class="divider"></div>
      `
    })
  },

  // Referral Template
  [EmailType.REFERRAL_INVITATION]: {
    subject: 'You\'re Invited to Join Peaceful Investment!',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'You\'re Invited to Join Peaceful Investment!',
      content: `
        <h2>Your Friend Invited You to Join!</h2>
        <p>Dear {{recipientName}},</p>
        
        <p>{{inviterName}} has invited you to join Peaceful Investment, a leading platform for smart and peaceful investment opportunities.</p>
        
        <p><strong>Why join Peaceful Investment?</strong></p>
        <ul style="color: #6b7280; line-height: 1.8;">
          <li>Access to exclusive investment opportunities</li>
          <li>Professional trading tools and analytics</li>
          <li>24/7 customer support</li>
          <li>Secure and transparent platform</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{invitationLink}}" class="button">Accept Invitation</a>
        </div>
        
        <div class="info-box">
          <p><strong>Special Offer:</strong> When you join through this invitation, you'll receive a {{bonusAmount}} bonus to start your investment journey!</p>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #FFD700;">{{invitationLink}}</p>
        
        <div class="divider"></div>
        
        <p>If you're not interested, you can simply ignore this email.</p>
        <p>Best regards,<br><strong>The Peaceful Investment Team</strong></p>
      `
    })
  },

  // Contact Form Template
  [EmailType.CONTACT_FORM]: {
    subject: 'Thank You for Contacting Peaceful Investment',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'Thank You for Contacting Us',
      content: `
        <h2>Thank You for Your Message!</h2>
        <p>Dear {{name}},</p>
        
        <p>Thank you for reaching out to Peaceful Investment. We've received your message and will get back to you soon.</p>
        
        <div class="info-box">
          <p><strong>Your Message:</strong></p>
          <p style="margin: 0; color: #374151;">{{message}}</p>
        </div>
        
        <p>Our team typically responds within 24 hours during business days.</p>
        
        <div class="divider"></div>
        
        <p>🌐 Website: <a href="https://peacefulinvestment.com">peacefulinvestment.com</a></p>
      `
    })
  },

  // Admin Templates
  [EmailType.NEW_USER_REGISTRATION]: {
    subject: 'New User Registration - Peaceful Investment Admin',
    senderEmail: 'admin@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment System',
    htmlContent: renderTemplate(BASE_EMAIL_TEMPLATE, {
      subject: 'New User Registration Alert',
      content: `
        <h2>New User Registration</h2>
        <p>A new user has registered on the Peaceful Investment platform.</p>
        
        <div class="info-box">
          <p><strong>User Details:</strong></p>
          <p><strong>Name:</strong> {{userName}}</p>
          <p><strong>Email:</strong> {{userEmail}}</p>
          <p><strong>Registration Date:</strong> {{registrationDate}}</p>
          <p><strong>Account Status:</strong> {{accountStatus}}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="{{adminLink}}" class="button">View in Admin Panel</a>
        </div>
        
        <p>Please review the new registration and take appropriate action if needed.</p>
      `
    })
  },

  // Placeholder templates for other types
  [EmailType.ACCOUNT_LOCKOUT]: {
    subject: 'Account Security Alert - Peaceful Investment',
    senderEmail: 'support@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Security',
    htmlContent: '<h2>Account Lockout</h2><p>Your account has been temporarily locked for security reasons.</p>'
  },

  [EmailType.PROFILE_SETUP_REMINDER]: {
    subject: 'Complete Your Profile - Peaceful Investment',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Team',
    htmlContent: '<h2>Profile Setup Reminder</h2><p>Please complete your profile setup to access all features.</p>'
  },

  [EmailType.ACCOUNT_APPROVAL]: {
    subject: 'Account Approved - Peaceful Investment',
    senderEmail: 'admin@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Admin',
    htmlContent: '<h2>Account Approved</h2><p>Your account has been approved and is now active.</p>'
  },

  [EmailType.SUPPORT_RESPONSE]: {
    subject: 'Response to Your Support Request - Peaceful Investment',
    senderEmail: 'support@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Support',
    htmlContent: '<h2>Support Response</h2><p>We have responded to your support request.</p>'
  },

  [EmailType.REFERRAL_SUCCESS]: {
    subject: 'Referral Bonus Earned - Peaceful Investment',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment',
    htmlContent: '<h2>Referral Success</h2><p>Congratulations! You have earned a referral bonus.</p>'
  },

  [EmailType.INVESTMENT_UPDATE]: {
    subject: 'Investment Update - Peaceful Investment',
    senderEmail: 'info@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment',
    htmlContent: '<h2>Investment Update</h2><p>Your investment portfolio has been updated.</p>'
  },

  [EmailType.DOCUMENT_REQUEST]: {
    subject: 'Document Request - Peaceful Investment',
    senderEmail: 'admin@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Compliance',
    htmlContent: '<h2>Document Request</h2><p>Please submit the requested documents for compliance.</p>'
  },

  [EmailType.SUPPORT_TICKET_UPDATE]: {
    subject: 'Support Ticket Update - Peaceful Investment',
    senderEmail: 'support@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment Support',
    htmlContent: '<h2>Support Ticket Update</h2><p>Your support ticket has been updated.</p>'
  },

  [EmailType.SYSTEM_ALERT]: {
    subject: 'System Alert - Peaceful Investment',
    senderEmail: 'admin@peacefulinvestment.com' as any,
    senderName: 'Peaceful Investment System',
    htmlContent: '<h2>System Alert</h2><p>A system alert has been triggered.</p>'
  },
};

