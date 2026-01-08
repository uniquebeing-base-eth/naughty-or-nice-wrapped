
const ChristmasDecorations = () => {
  return (
    <>
      {/* Corner decorations */}
      <div className="fixed top-16 left-4 text-5xl animate-swing z-20" style={{ animationDelay: '0s' }}>
        🎄
      </div>
      <div className="fixed top-20 right-6 text-4xl animate-float z-20" style={{ animationDelay: '0.5s' }}>
        ⭐
      </div>
      <div className="fixed bottom-40 left-6 text-4xl animate-float z-20" style={{ animationDelay: '1s' }}>
        🎁
      </div>
      <div className="fixed bottom-48 right-4 text-5xl animate-swing z-20" style={{ animationDelay: '1.5s' }}>
        🔔
      </div>
      
      {/* Ornaments */}
      <div className="fixed top-1/4 left-8 w-6 h-6 rounded-full bg-christmas-red ornament animate-swing opacity-80" style={{ animationDelay: '0.3s' }} />
      <div className="fixed top-1/3 right-10 w-5 h-5 rounded-full bg-christmas-gold ornament animate-swing opacity-80" style={{ animationDelay: '0.8s' }} />
      <div className="fixed bottom-1/3 left-12 w-4 h-4 rounded-full bg-christmas-green ornament animate-swing opacity-70" style={{ animationDelay: '1.2s' }} />
      
      {/* Sparkles */}
      <div className="fixed top-1/2 left-16 text-xl animate-sparkle" style={{ animationDelay: '0s' }}>✨</div>
      <div className="fixed top-1/4 right-20 text-lg animate-sparkle" style={{ animationDelay: '0.7s' }}>✨</div>
      <div className="fixed bottom-1/4 left-20 text-xl animate-sparkle" style={{ animationDelay: '1.4s' }}>✨</div>
      <div className="fixed bottom-1/2 right-16 text-lg animate-sparkle" style={{ animationDelay: '2.1s' }}>✨</div>
    </>
  );
};

export default ChristmasDecorations;
