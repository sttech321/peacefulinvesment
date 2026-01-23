interface StorageItem<T> {
  value: T;
  expiry: number;
}

const DEFAULT_EXPIRY_HOURS = 24;

/**
 * Set an item in localStorage with automatic expiry
 * @param key - Storage key
 * @param value - Value to store
 * @param expiryHours - Hours until expiry (default: 24)
 */
export function setWithExpiry<T>(
  key: string,
  value: T,
  expiryHours: number = DEFAULT_EXPIRY_HOURS
): void {
  try {
    const now = new Date();
    const item: StorageItem<T> = {
      value,
      expiry: now.getTime() + expiryHours * 60 * 60 * 1000,
    };
    window.localStorage.setItem(key, JSON.stringify(item));
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get an item from localStorage, returns null if expired or not found
 * @param key - Storage key
 * @returns The stored value or null if expired/not found
 */
export function getWithExpiry<T>(key: string): T | null {
  try {
    const itemStr = window.localStorage.getItem(key);
    if (!itemStr) {
      return null;
    }

    const item: StorageItem<T> = JSON.parse(itemStr);
    const now = new Date();

    // Check if expired
    if (now.getTime() > item.expiry) {
      window.localStorage.removeItem(key);
      return null;
    }

    return item.value;
  } catch {
    return null;
  }
}

/**
 * Remove an item from localStorage
 * @param key - Storage key
 */
export function removeItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Silently fail
  }
}

/**
 * Clear all expired items from localStorage
 */
export function clearExpiredItems(): void {
  try {
    const now = new Date().getTime();
    const keys = Object.keys(window.localStorage);

    keys.forEach((key) => {
      try {
        const itemStr = window.localStorage.getItem(key);
        if (itemStr) {
          const item = JSON.parse(itemStr);
          if (item.expiry && now > item.expiry) {
            window.localStorage.removeItem(key);
          }
        }
      } catch {
        // Skip items that aren't in our format
      }
    });
  } catch {
    // Silently fail
  }
}

/**
 * Initialize automatic cleanup of expired items
 * Runs immediately and then every 30 seconds
 */
export function initAutoCleanup(): void {
  // Clean expired items immediately
  clearExpiredItems();
  
  // Set up periodic cleanup every 30 seconds
  setInterval(() => {
    clearExpiredItems();
  }, 30000);
}

// Auto-initialize cleanup when module loads
if (typeof window !== 'undefined') {
  initAutoCleanup();
}
