import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

type UseAutoLogoutOptions = {
  /**
   * Override the inactivity timeout in minutes.
   * If not provided, falls back to `import.meta.env.VITE_INACTIVITY_MINUTES`.
   */
  inactivityMinutes?: number;
  /**
   * Where to send the user after an inactivity logout.
   */
  redirectTo?: string;
  /**
   * When true, logs a 1s console countdown showing time remaining until auto-logout.
   * Defaults to `import.meta.env.DEV` (dev only).
   */
  debug?: boolean;
};

const DEFAULT_INACTIVITY_MINUTES = 15;
const ACTIVITY_THROTTLE_MS = 250;

function parseInactivityMinutes(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function clearAuthStorage() {
  const keysToRemoveExact = new Set([
    "token",
    "authToken",
    "access_token",
    "refresh_token",
    "id_token",
    "pocketbase_auth",
  ]);

  const shouldRemoveKey = (key: string) => {
    if (keysToRemoveExact.has(key)) return true;
    // Supabase persists sessions under keys like: sb-<project-ref>-auth-token
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) return true;
    return false;
  };

  const safeClear = (storage: Storage) => {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k) keys.push(k);
    }
    keys.forEach((k) => {
      if (shouldRemoveKey(k)) storage.removeItem(k);
    });
  };

  try {
    safeClear(window.localStorage);
  } catch {
    // ignore
  }

  try {
    safeClear(window.sessionStorage);
  } catch {
    // ignore
  }
}

/**
 * Automatically signs the user out after a period of inactivity.
 * Tracks: mouse move, key press, click, scroll.
 *
 * Configuration:
 * - Vite env: `VITE_INACTIVITY_MINUTES` (minutes)
 */
export function useAutoLogout(options: UseAutoLogoutOptions = {}) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const debug = options.debug ?? import.meta.env.DEV;

  const inactivityMinutes = useMemo(() => {
    const fromOptions = parseInactivityMinutes(options.inactivityMinutes);
    if (fromOptions != null) return fromOptions;

    const fromEnv = parseInactivityMinutes(
      import.meta.env.VITE_INACTIVITY_MINUTES
    );
    if (fromEnv != null) return fromEnv;

    return DEFAULT_INACTIVITY_MINUTES;
  }, [options.inactivityMinutes]);

  const inactivityTimeoutMs = useMemo(
    () => inactivityMinutes * 60_000,
    [inactivityMinutes]
  );

  const redirectTo = options.redirectTo ?? "/login";

  const timerIdRef = useRef<number | null>(null);
  const countdownIdRef = useRef<number | null>(null);
  const deadlineMsRef = useRef<number | null>(null);
  const lastResetAtRef = useRef(0);
  const isLoggingOutRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (timerIdRef.current != null) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownIdRef.current != null) {
      window.clearInterval(countdownIdRef.current);
      countdownIdRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (!debug) return;
    stopCountdown();

    countdownIdRef.current = window.setInterval(() => {
      const deadline = deadlineMsRef.current;
      if (deadline == null) return;

      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        console.info("[AutoLogout] Inactivity timeout reached. Logging out...");
        stopCountdown();
        return;
      }

      const remainingSeconds = Math.ceil(remainingMs / 1000);
      console.info(`[AutoLogout] No activity. Auto-logout in ${remainingSeconds}s`);
    }, 1000);
  }, [debug, stopCountdown]);

  const runLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      // Primary sign-out path (clears Supabase session).
      await signOut();
    } finally {
      stopTimer();
      stopCountdown();
      deadlineMsRef.current = null;

      // Safety: clear any persisted auth tokens (Supabase and common token keys).
      clearAuthStorage();

      // Extra safety: ensure Supabase has no active session in memory.
      // (Does not throw if already signed out.)
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }

      navigate(redirectTo, { replace: true });
      isLoggingOutRef.current = false;
    }
  }, [navigate, redirectTo, signOut, stopCountdown, stopTimer]);

  const startOrResetTimer = useCallback(() => {
    stopTimer();
    deadlineMsRef.current = Date.now() + inactivityTimeoutMs;

    if (debug) {
      console.info(
        `[AutoLogout] Inactivity timer reset. Auto-logout in ${Math.ceil(
          inactivityTimeoutMs / 1000
        )}s`
      );
    }

    startCountdown();
    timerIdRef.current = window.setTimeout(() => {
      void runLogout();
    }, inactivityTimeoutMs);
  }, [debug, inactivityTimeoutMs, runLogout, startCountdown, stopTimer]);

  const onActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastResetAtRef.current < ACTIVITY_THROTTLE_MS) return;
    lastResetAtRef.current = now;
    startOrResetTimer();
  }, [startOrResetTimer]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      stopTimer();
      stopCountdown();
      deadlineMsRef.current = null;
      return;
    }

    // Initialize timer immediately when the user is authenticated.
    startOrResetTimer();

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
    ];

    const listenerOptions: AddEventListenerOptions = { passive: true };
    events.forEach((evt) =>
      window.addEventListener(evt, onActivity, listenerOptions)
    );

    return () => {
      events.forEach((evt) =>
        window.removeEventListener(evt, onActivity, listenerOptions)
      );
      stopTimer();
      stopCountdown();
      deadlineMsRef.current = null;
    };
  }, [loading, onActivity, startOrResetTimer, stopCountdown, stopTimer, user]);
}

