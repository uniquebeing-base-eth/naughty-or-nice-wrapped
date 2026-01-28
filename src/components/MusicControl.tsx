import { Volume2, VolumeX } from 'lucide-react';


interface MusicControlProps {
  isMuted: boolean;
  onToggle: () => void;
}


const MusicControl = ({ isMuted, onToggle }: MusicControlProps) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-christmas-green/80 backdrop-blur-sm border-2 border-christmas-gold/50 shadow-lg hover:scale-110 transition-transform"
      aria-label={isMuted ? 'Unmute music' : 'Mute music'}
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-white" />
      ) : (
        <Volume2 className="w-5 h-5 text-white animate-pulse" />
      )}
    </button>
  );
};

export default MusicControl;
