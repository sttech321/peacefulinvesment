import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import defaultHomePageContent from '@/config/homePagecontent.json';

export type HomePageContent = typeof defaultHomePageContent & Record<string, unknown>;

const HOME_PAGE_KEY = 'home_page_content';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const mergeWithDefaults = (defaults: unknown, overrides: unknown): unknown => {
  if (overrides === undefined || overrides === null) return defaults;

  if (Array.isArray(defaults) && Array.isArray(overrides)) {
    if (defaults.length === 0) return overrides;
    const length = defaults.length;
    return Array.from({ length }).map((_, idx) => {
      const defItem = defaults[idx];
      const overrideItem = overrides[idx];
      return mergeWithDefaults(defItem, overrideItem);
    });
  }

  if (isPlainObject(defaults) && isPlainObject(overrides)) {
    const merged: Record<string, unknown> = { ...defaults };
    Object.keys(overrides).forEach((key) => {
      merged[key] = mergeWithDefaults((defaults as Record<string, unknown>)[key], overrides[key]);
    });
    return merged;
  }

  return overrides;
};

const mergeContent = (parsed: unknown): HomePageContent => {
  if (!parsed || typeof parsed !== 'object') {
    return { ...defaultHomePageContent } as HomePageContent;
  }

  return mergeWithDefaults(defaultHomePageContent, parsed) as HomePageContent;
};

export function useHomePageContent() {
  const [content, setContent] = useState<HomePageContent>(() => ({
    ...defaultHomePageContent
  }));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', HOME_PAGE_KEY)
          .maybeSingle();

        if (!error && data?.value) {
          const parsed = JSON.parse(data.value);
          setContent(mergeContent(parsed));
        } else {
          setContent(mergeContent(undefined));
        }
      } catch {
        setContent(mergeContent(undefined));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('home_page_content')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        (payload: any) => {
          const next = payload?.new as { key?: string; value?: unknown } | null;
          const previous = payload?.old as { key?: string; value?: unknown } | null;
          const changedKey = next?.key ?? previous?.key;

          if (changedKey !== HOME_PAGE_KEY) return;

          if (payload?.eventType === 'DELETE') {
            setContent(mergeContent(undefined));
            return;
          }

          const raw = next?.value;
          if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              setContent(mergeContent(parsed));
            } catch {
              // ignore invalid JSON
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<HomePageContent>).detail;
      if (!detail) return;
      setContent(mergeContent(detail));
    };

    window.addEventListener('home_page_content_updated', handler as EventListener);
    return () => window.removeEventListener('home_page_content_updated', handler as EventListener);
  }, []);

  return { content, loading, setContent };
}
