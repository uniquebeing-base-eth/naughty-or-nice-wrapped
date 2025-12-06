interface SlideProgressProps {
  currentSlide: number;
  totalSlides: number;
}

const SlideProgress = ({ currentSlide, totalSlides }: SlideProgressProps) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-50 px-6 pointer-events-none">
      <div className="max-w-md mx-auto">
        {/* Progress bars */}
        <div className="flex gap-1.5">
          {Array.from({ length: totalSlides }, (_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full bg-muted/50 overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i < currentSlide
                    ? 'w-full bg-christmas-gold'
                    : i === currentSlide
                    ? 'w-full bg-gradient-to-r from-christmas-red to-christmas-gold animate-pulse'
                    : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Tap hint */}
        <p className="text-center text-christmas-snow/40 text-xs mt-3 font-medium">
          ← Tap left to go back · Tap right to continue →
        </p>
      </div>
    </div>
  );
};

export default SlideProgress;
