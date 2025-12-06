import { useMemo } from 'react';

interface SnowflakeProps {
  style: React.CSSProperties;
  size: 'sm' | 'md' | 'lg';
}

const Snowflake = ({ style, size }: SnowflakeProps) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div
      className={`absolute rounded-full bg-christmas-snow/60 ${sizeClasses[size]}`}
      style={style}
    />
  );
};

const Snowfall = () => {
  const snowflakes = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => {
      const size = ['sm', 'md', 'lg'][Math.floor(Math.random() * 3)] as 'sm' | 'md' | 'lg';
      const duration = 8 + Math.random() * 12;
      const delay = Math.random() * 10;
      const left = Math.random() * 100;
      const opacity = 0.3 + Math.random() * 0.5;

      return {
        id: i,
        size,
        style: {
          left: `${left}%`,
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
        <Snowflake
          key={flake.id}
          size={flake.size}
          style={{
            ...flake.style,
            animation: `snowfall ${flake.style.animationDuration} linear ${flake.style.animationDelay} infinite`,
          }}
        />
      ))}
    </div>
  );
};

export default Snowfall;
