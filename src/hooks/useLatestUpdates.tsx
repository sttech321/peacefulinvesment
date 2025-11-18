import { useState, useEffect } from 'react';
import { pocketbase, getLatestUpdates, getDownloadUrl } from '@/integrations/pocketbase/client';

export interface UpdateRecord {
  id: string;
  version: string;
  platform: string;
  type: 'release' | 'patch';
  attachment: string;
  description: string;
  force_update: boolean;
  serve_to: string[];
  created: string;
  updated: string;
  downloadUrl?: string;
}

export interface LatestUpdates {
  windows?: UpdateRecord;
  android?: UpdateRecord;
  ios?: UpdateRecord;
  loading: boolean;
  error: string | null;
}

export const useLatestUpdates = (): LatestUpdates => {
  const [updates, setUpdates] = useState<LatestUpdates>({
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchLatestUpdates = async () => {
      try {
        // Fetch latest Windows, Android, and iOS updates
        const [windowsUpdate, androidUpdate, iosUpdate] = await Promise.all([
          getLatestUpdates('windows'),
          getLatestUpdates('android'),
          getLatestUpdates('ios')
        ]);

        setUpdates({
          windows: windowsUpdate ? {
            ...windowsUpdate,
            downloadUrl: getDownloadUrl(windowsUpdate)
          } : undefined,
          android: androidUpdate ? {
            ...androidUpdate,
            downloadUrl: getDownloadUrl(androidUpdate)
          } : undefined,
          ios: iosUpdate ? {
            ...iosUpdate,
            downloadUrl: getDownloadUrl(iosUpdate)
          } : undefined,
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Failed to fetch latest updates:', error);
        setUpdates({
          loading: false,
          error: 'Failed to load latest versions'
        });
      }
    };

    fetchLatestUpdates();
  }, []);

  return updates;
};
