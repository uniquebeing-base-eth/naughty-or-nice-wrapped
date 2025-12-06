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
    <div className="fixed bottom-8 left-0 right-0 z-50 px-6">
      <div className="max-w-sm mx-auto">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? 'w-8 bg-christmas-gold'
                  : i < currentSlide
                  ? 'w-1.5 bg-christmas-gold/50'
                  : 'w-1.5 bg-muted'
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
            className={`rounded-full w-12 h-12 border border-border/50 transition-all ${
              canGoPrev 
                ? 'text-foreground hover:bg-card hover:border-christmas-gold/30' 
                : 'text-muted-foreground opacity-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <span className="text-sm text-muted-foreground font-medium">
            {currentSlide + 1} / {totalSlides}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            disabled={!canGoNext}
            className={`rounded-full w-12 h-12 transition-all ${
              canGoNext
                ? 'bg-christmas-red text-white hover:bg-christmas-red-dark'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SlideNavigation;
