// Email Configuration
export const emailConfig = {
  // Resend API Configuration
  // Note: In Vite, only variables prefixed with VITE_ are exposed to client code
  apiKey: import.meta.env.VITE_RESEND_API_KEY || '',
  
  // Email Addresses
  testEmail: import.meta.env.VITE_TEST_EMAIL || 'test@example.com',
  adminEmail: import.meta.env.VITE_ADMIN_EMAIL || 'admin@peacefulinvestment.com',
  
  // Development Settings
  isDevelopment: import.meta.env.DEV,
  
  // Email Settings
  defaultSender: {
    support: 'support@peacefulinvestment.com',
    admin: 'admin@peacefulinvestment.com',
    info: 'info@peacefulinvestment.com',
    noreply: 'noreply@peacefulinvestment.com',
  },
  
  // Template Settings
  templateSettings: {
    baseUrl: import.meta.env.VITE_APP_URL || 'https://peacefulinvestment.com',
    companyName: 'Peaceful Investment',
    supportEmail: 'support@peacefulinvestment.com',
    phoneNumber: '+1 (772) 321-1897',
  },
};

// Validate configuration
export function validateEmailConfig() {
  const errors: string[] = [];
  
  if (!emailConfig.apiKey) {
    errors.push('VITE_RESEND_API_KEY is required in .env file (e.g., VITE_RESEND_API_KEY=re_your_key_here)');
  }
  
  if (errors.length > 0) {
    console.error('Email configuration errors:', errors);
    return false;
  }
  
  return true;
}

// Get Resend API key
export function getResendApiKey() {
  return emailConfig.apiKey;
}
