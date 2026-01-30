import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_APP_TEXTS
} from "@/config/appTextDefinitions";

export function useAppTexts() {
  const [texts, setTexts] = useState<Record<string, string>>(
    DEFAULT_APP_TEXTS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTexts = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (!error && data) {
        const merged = { ...DEFAULT_APP_TEXTS };

        data.forEach((row: any) => {
          if (row.key in merged) {
            merged[row.key] = row.value;
          }
        });

        setTexts(merged);
      }

      setLoading(false);
    };

    fetchTexts();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("app_settings_texts")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings" },
        (payload: any) => {
          const next = payload?.new as { key?: string; value?: unknown } | null;
          const previous = payload?.old as { key?: string } | null;
          const changedKey = next?.key ?? previous?.key;

          if (!changedKey) return;
          if (!(changedKey in DEFAULT_APP_TEXTS)) return;

          if (payload?.eventType === "DELETE") {
            setTexts((prev) => ({
              ...prev,
              [changedKey]: DEFAULT_APP_TEXTS[changedKey]
            }));
            return;
          }

          const nextValue = next?.value;
          setTexts((prev) => ({
            ...prev,
            [changedKey]: typeof nextValue === "string" ? nextValue : String(nextValue ?? "")
          }));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, string>>).detail;
      if (!detail) return;

      setTexts((prev) => {
        const next = { ...prev };
        Object.entries(detail).forEach(([key, value]) => {
          if (key in DEFAULT_APP_TEXTS) {
            next[key] = value;
          }
        });
        return next;
      });
    };

    window.addEventListener("app_texts_updated", handler as EventListener);
    return () => window.removeEventListener("app_texts_updated", handler as EventListener);
  }, []);

  return {
    texts,
    loading,
  };
}