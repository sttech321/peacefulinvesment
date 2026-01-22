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

  return {
    texts,
    loading,
  };
}