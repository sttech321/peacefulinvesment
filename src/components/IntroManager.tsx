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

export default function IntroManager() {
  const location = useLocation();
  const { user, loading } = useAuth();

  const [introCompleted, setIntroCompleted] = React.useState(() => isIntroCompleted());
  const [activeIntro, setActiveIntro] = React.useState<ActiveIntro>(null);

  // If the user is authenticated, never force the intro gate again.
  React.useEffect(() => {
    if (!user) return;
    if (introCompleted) return;

    markIntroCompleted();
    setIntroCompleted(true);
  }, [user, introCompleted]);

  // Show the big "first visit" gate only on the home page, and only when logged out.
  React.useEffect(() => {
    const isHome = location.pathname === '/';

    if (!isHome) {
      if (activeIntro === 'gate') setActiveIntro(null);
      return;
    }

    if (loading) return;
    if (user) return;
    if (introCompleted) return;

    if (activeIntro === null) setActiveIntro('gate');
  }, [activeIntro, introCompleted, loading, location.pathname, user]);

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

  if (!activeIntro) return null;

  return (
    <LoadingScreen
      variant={activeIntro}
      timeoutMs={INTRO_TIMEOUT_MS}
      onFinish={handleFinish}
    />
  );
}
