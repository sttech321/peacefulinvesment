// Email Configuration
export const emailConfig = {
  // Mailjet API Configuration
  apiKey: import.meta.env.VITE_MAILJET_API_KEY || '05c841c5a340e927a0a464d63a975e5b:f77d3f48c1cebee086d0bfd101516773',
  apiRegion: import.meta.env.VITE_MAILJET_API_REGION || 'us',
  
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
    errors.push('MAILJET_API_KEY is required');
  }
  
  if (!emailConfig.apiKey.includes(':')) {
    errors.push('MAILJET_API_KEY must be in format "api_key:secret_key"');
  }
  
  if (errors.length > 0) {
    console.error('Email configuration errors:', errors);
    return false;
  }
  
  return true;
}

// Get API credentials
export function getMailjetCredentials() {
  const [apiKey, secretKey] = emailConfig.apiKey.split(':');
  return { apiKey, secretKey };
}
