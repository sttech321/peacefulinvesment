import React from 'react';
import { useLocation } from 'react-router-dom';
import LoadingScreen from '@/components/ui/loading-screen';
import { useAuth } from '@/hooks/useAuth';
import {
  INTRO_REPLAY_EVENT,
  isIntroCompleted,
  markIntroCompleted,
} from '@/utils/intro';

type ActiveIntro = null | 'gate' | 'replay';

const INTRO_TIMEOUT_MS = 13000;

interface IntroManagerProps {
  /**
   * When `true`, the first-visit gate intro is currently active and the rest of
   * the app UI should not mount.
   */
  onGateBlockingChange?: (isBlocking: boolean) => void;
}

export default function IntroManager({ onGateBlockingChange }: IntroManagerProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  const [introCompleted, setIntroCompleted] = React.useState(() => isIntroCompleted());
  const [activeIntro, setActiveIntro] = React.useState<ActiveIntro>(() => {
    // On first page load, ensure the gate intro can appear immediately
    // (before any effects run), so the app UI doesn't mount behind it.
    if (isIntroCompleted()) return null;
    // If auth hasn't resolved yet, we still default to showing the gate.
    // If the user is actually authenticated, we'll cancel the gate once `user` is known.
    return 'gate';
  });

  // If the user is authenticated, never force the intro gate again.
  React.useEffect(() => {
    if (!user) return;
    if (introCompleted) return;

    markIntroCompleted();
    setIntroCompleted(true);
    if (activeIntro === 'gate') setActiveIntro(null);
  }, [user, introCompleted, activeIntro]);

  // Show the big "first visit" gate on any page, and only when logged out.
  React.useEffect(() => {
    if (loading) return;
    if (user) return;
    if (introCompleted) return;

    if (activeIntro === null) setActiveIntro('gate');
  }, [activeIntro, introCompleted, loading, user]);

  // Listen for "replay" requests (from the small button on the home page).
  React.useEffect(() => {
    const onReplay = () => setActiveIntro('replay');

    window.addEventListener(INTRO_REPLAY_EVENT, onReplay);
    return () => window.removeEventListener(INTRO_REPLAY_EVENT, onReplay);
  }, []);

  const handleFinish = () => {
    if (activeIntro === 'gate') {
      markIntroCompleted();
      setIntroCompleted(true);
    }

    setActiveIntro(null);
  };

  // Block mounting of the app UI whenever the first-visit gate is applicable.
  // This ensures content doesn't mount/load behind the big Play button.
  const shouldBlockApp = !introCompleted && !user;

  React.useEffect(() => {
    onGateBlockingChange?.(shouldBlockApp);
    return () => onGateBlockingChange?.(false);
  }, [shouldBlockApp, onGateBlockingChange]);

  if (!activeIntro) return null;

  return (
    <LoadingScreen
      variant={activeIntro}
      timeoutMs={INTRO_TIMEOUT_MS}
      onFinish={handleFinish}
    />
  );
}
