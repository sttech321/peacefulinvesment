import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import logoAnimation from '@/assets/preloader-animation-video.mp4';
import logoAudio from '@/assets/audio-logoAnimation.mp3';
import { lockPageScroll } from '@/utils/scrollLock';

export type LoadingScreenVariant = 'gate' | 'replay';

interface LoadingScreenProps {
  variant?: LoadingScreenVariant;
  /**
   * Total time (ms) the intro is shown once started.
   */
  timeoutMs?: number;
  /**
   * Called when the intro finishes (after start).
   */
  onFinish?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant = 'gate',
  timeoutMs = 13000,
  onFinish,
}) => {
  const [phase, setPhase] = useState<'full' | 'moving' | 'hidden'>('full');
  const [hasStarted, setHasStarted] = useState(() => variant === 'replay');

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const moveDuration = 800; // ms
  const fullPhaseTime = useMemo(
    () => Math.max(0, timeoutMs - moveDuration),
    [timeoutMs]
  );

  const startPlayback = useCallback(async () => {
    try {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }
    } catch {
      // Ignore: playback may fail on some browsers if the element isn't ready.
    }

    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        await audioRef.current.play();
      }
    } catch {
      // Ignore: if audio playback fails, we still show the logo animation.
    }
  }, []);

  useEffect(() => {
    if (!hasStarted) return;
    void startPlayback();
  }, [hasStarted, startPlayback]);

  useEffect(() => {
    if (!hasStarted) return;

    // Two-stage effect: full screen, then briefly animate to navbar position.
    const fullTimer = window.setTimeout(() => {
      setPhase('moving');

      const hideTimer = window.setTimeout(() => {
        setPhase('hidden');
        onFinish?.();
      }, moveDuration);

      return () => window.clearTimeout(hideTimer);
    }, fullPhaseTime);

    return () => window.clearTimeout(fullTimer);
  }, [hasStarted, fullPhaseTime, moveDuration, onFinish]);

  useEffect(() => {
    // If variant changes while mounted, reset appropriately.
    setPhase('full');
    setHasStarted(variant === 'replay');
  }, [variant]);

  const isVisible = phase !== 'hidden';

  useEffect(() => {
    if (!isVisible) return;
    return lockPageScroll();
  }, [isVisible]);

  if (phase === 'hidden') return null;

  const isMoving = phase === 'moving';

  const handleStart = () => {
    if (hasStarted) return;
    setHasStarted(true);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black">
      <div
        className="absolute inset-0 max-w-7xl mx-auto flex items-center justify-center transition-all duration-700 ease-in-out"
        style={
          isMoving
            ? {
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
                paddingTop: '14px',
                paddingLeft: '0px',
              }
            : undefined
        }
      >
        <video
          ref={videoRef}
          src={logoAnimation}
          muted
          playsInline
          preload="auto"
          className={`object-contain transition-all duration-700 ease-in-out ${
            isMoving ? 'w-10 h-10 rounded-full' : 'w-full h-full'
          }`}
        />
        <audio ref={audioRef} src={logoAudio} preload="auto" />

        {variant === 'gate' && !hasStarted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              type="button"
              onClick={handleStart}
              className="group flex h-60 w-60 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white shadow-[0_0_50px_rgba(255,255,255,0.08)] backdrop-blur transition hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Play intro"
            >
              <Play className="h-32 w-32 translate-x-0.5 transition group-hover:scale-110" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;