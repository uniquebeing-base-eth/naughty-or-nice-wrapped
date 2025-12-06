import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SlideNavigationProps {
  currentSlide: number;
  totalSlides: number;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

const SlideNavigation = ({
  currentSlide,
  totalSlides,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}: SlideNavigationProps) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-6">
      <div className="max-w-sm mx-auto">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-4">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-10 bg-gradient-to-r from-christmas-gold to-christmas-gold-light shadow-lg shadow-christmas-gold/40'
                  : i < currentSlide
                  ? 'w-2 bg-christmas-green'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            disabled={!canGoPrev}
            className={`rounded-full w-14 h-14 transition-all ${
              canGoPrev 
                ? 'bg-card/80 border-2 border-christmas-gold/30 text-christmas-gold hover:bg-christmas-gold/20 hover:border-christmas-gold' 
                : 'bg-muted/50 text-muted-foreground opacity-50'
            }`}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <span className="text-base text-christmas-gold font-bold">
            {currentSlide + 1} / {totalSlides}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className={`rounded-full w-14 h-14 transition-all ${
              canGoNext
                ? 'bg-gradient-to-r from-christmas-red to-christmas-red-dark text-white hover:from-christmas-red-light hover:to-christmas-red shadow-lg shadow-christmas-red/40 border-2 border-christmas-gold/30'
                : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SlideNavigation;
