import { ChevronLeft, ChevronRight } from 'lucide-react';


interface SlideNavigationProps {
  onPrev: () => void;
  onNext: () => void;
  showPrev: boolean;
  showNext: boolean;
}


const SlideNavigation = ({ onPrev, onNext, showPrev, showNext }: SlideNavigationProps) => {
  return (
    <div className="fixed bottom-28 left-0 right-0 flex justify-between px-6 z-40 pointer-events-none">
      {showPrev ? (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="w-12 h-12 rounded-full bg-christmas-snow/10 backdrop-blur-sm border border-christmas-gold/30 flex items-center justify-center text-christmas-snow/80 hover:bg-christmas-snow/20 hover:text-christmas-snow transition-all pointer-events-auto touch-manipulation active:scale-95"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-12" />
      )}
      
      {showNext ? (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="w-12 h-12 rounded-full bg-christmas-snow/10 backdrop-blur-sm border border-christmas-gold/30 flex items-center justify-center text-christmas-snow/80 hover:bg-christmas-snow/20 hover:text-christmas-snow transition-all pointer-events-auto touch-manipulation active:scale-95"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-12" />
      )}
    </div>
  );
};

export default SlideNavigation;
