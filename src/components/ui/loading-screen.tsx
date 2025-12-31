import React, { useEffect, useRef, useState } from 'react';
import logoAnimation from '@/assets/preloader-animation-video.mp4';
import audiologoAnimation from '@/assets/audio-logoAnimation.mp3';
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
// const videoRef = useRef(null);

// const enableSound = () => {
//   videoRef.current.muted = false;
//   videoRef.current.play();
// };
const LoadingScreen: React.FC<LoadingScreenProps> = ({
  timeoutMs = 13000,
  onFinish,
}) => {
  const [phase, setPhase] = useState<'full' | 'moving' | 'hidden'>('full');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const handleEnableAudio = () => {
    setAudioEnabled(true);

    if (videoRef.current) {
      videoRef.current.muted = false;
      void videoRef.current.play();
    }

    if (audioRef.current) {
      audioRef.current.muted = false;
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
    }
  };

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
                paddingLeft: '0px',
              }
            : undefined
        }
      >
        <video
          ref={videoRef}
          src={logoAnimation}
          autoPlay
          muted={!audioEnabled}
          loop
          playsInline
          className={`object-contain transition-all duration-700 ease-in-out ${
            isMoving ? 'w-10 h-10 rounded-full' : 'w-full h-full'
          }`}
        />
 
        {!audioEnabled && (
          <button
            type="button"
            onClick={handleEnableAudio}
            className="absolute bottom-8 right-8 pointer-events-auto rounded-full bg-white/10 px-4 py-2 text-sm font-medium uppercase tracking-wide text-white backdrop-blur transition hover:bg-white/20"
          >
            Enable sound
          </button>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;

// 