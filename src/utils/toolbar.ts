import { initToolbar } from '@21st-extension/toolbar';

// Define your toolbar configuration
const stagewiseConfig = {
  plugins: [],
  // You can add more configuration options here
  // theme: 'dark' | 'light',
  // position: 'top' | 'bottom',
  // etc.
};

// Initialize the toolbar when your app starts
export function setupStagewise() {
  // Only initialize once and only in development mode
  if (import.meta.env.DEV) {
    try {
      initToolbar(stagewiseConfig);
      console.log('🎉 21st Extension Toolbar initialized successfully!');
    } catch (error) {
      console.error('Failed to initialize 21st Extension Toolbar:', error);
    }
  }
}

// Export the config for potential reuse
export { stagewiseConfig };
