import { Smile, Sparkles } from 'lucide-react';

interface ModeToggleProps {
  isFunnyMode: boolean;
  onToggle: () => void;
}

const ModeToggle = ({ isFunnyMode, onToggle }: ModeToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className="fixed top-6 right-6 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:border-christmas-gold/30 transition-all text-sm"
    >
      {isFunnyMode ? (
        <>
          <Smile className="w-4 h-4 text-christmas-gold" />
          <span className="text-muted-foreground">Funny Mode</span>
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 text-christmas-snow" />
          <span className="text-muted-foreground">Clean Mode</span>
        </>
      )}
    </button>
  );
};

export default ModeToggle;
