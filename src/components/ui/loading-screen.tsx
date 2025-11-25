import React, { useEffect, useState } from 'react';
import logoAnimation from '@/assets/patrik-logo-animation.gif';

interface LoadingScreenProps {
  /**
   * Optional maximum time (ms) to keep the splash
   * visible in case the GIF event doesn't fire.
   */
  timeoutMs?: number;
  /**
   * Called when loading finishes (GIF ends or timeout).
   */
  onFinish?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  timeoutMs = 13000,
  onFinish,
}) => {
  const [phase, setPhase] = useState<'full' | 'moving' | 'hidden'>('full');

  useEffect(() => {
    // For a 2-stage effect, we spend most of the time
    // in full-screen mode, then briefly animate to the navbar
    // logo position before hiding completely.
    const moveDuration = 800; // ms
    const fullPhaseTime = Math.max(0, timeoutMs - moveDuration);

    const fullTimer = window.setTimeout(() => {
      setPhase('moving');

      const hideTimer = window.setTimeout(() => {
        setPhase('hidden');
        onFinish?.();
      }, moveDuration);

      return () => window.clearTimeout(hideTimer);
    }, fullPhaseTime);

    return () => {
      window.clearTimeout(fullTimer);
    };
  }, [timeoutMs, onFinish]);

  if (phase === 'hidden') return null;

  const isMoving = phase === 'moving';

  return (
    <div className="fixed inset-0 z-50 pointer-events-none bg-black">
      {/* Logo layer stays on a black background during both phases */}
      <div
        className={`absolute inset-0 max-w-7xl mx-auto flex items-center justify-center transition-all duration-700 ease-in-out`}
        style={
          isMoving
            ? {
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                paddingTop: '14px',
                paddingLeft: '24px',
              }
            : undefined
        }
      >
        <img
          src={logoAnimation}
          alt="Loading"
          className={`object-contain transition-all duration-700 ease-in-out ${
            isMoving ? 'w-10 h-10 rounded-full' : 'w-full h-full'
          }`}
        />
      </div>
    </div>
  );
};

export default LoadingScreen;

