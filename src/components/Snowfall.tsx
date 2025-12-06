import { useMemo } from 'react';

const Snowfall = () => {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const size = Math.random() * 8 + 4;
      const duration = 10 + Math.random() * 15;
      const delay = Math.random() * 10;
      const left = Math.random() * 100;
      const opacity = 0.4 + Math.random() * 0.6;

      return {
        id: i,
        size,
        style: {
          left: `${left}%`,
          width: `${size}px`,
          height: `${size}px`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          opacity,
        } as React.CSSProperties,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {snowflakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-christmas-snow animate-snowfall"
          style={flake.style}
        />
      ))}
    </div>
  );
};

export default Snowfall;
