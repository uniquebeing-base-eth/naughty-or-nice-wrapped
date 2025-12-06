import { useEffect, useRef, useState } from 'react';

export const useChristmasMusic = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    const audio = new Audio('/christmas-music.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    audioRef.current = audio;

    // Try to autoplay (may be blocked by browser)
    const playMusic = async () => {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.log('Autoplay blocked, waiting for user interaction');
        // Add click listener to start music on first interaction
        const startOnInteraction = async () => {
          try {
            await audio.play();
            setIsPlaying(true);
            document.removeEventListener('click', startOnInteraction);
            document.removeEventListener('touchstart', startOnInteraction);
          } catch (e) {
            console.log('Still cannot play:', e);
          }
        };
        document.addEventListener('click', startOnInteraction);
        document.addEventListener('touchstart', startOnInteraction);
      }
    };

    playMusic();

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const play = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.log('Cannot play:', err);
      }
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return {
    isPlaying,
    isMuted,
    toggleMute,
    play,
    pause,
  };
};
