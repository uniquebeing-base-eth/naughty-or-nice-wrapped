import { useMemo } from 'react';

const ChristmasLights = () => {
  const lights = useMemo(() => {
    const colors = [
      'bg-christmas-red',
      'bg-christmas-green', 
      'bg-christmas-gold',
      'bg-christmas-candy',
      'bg-christmas-ice',
    ];
    
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      delay: i * 0.15,
    }));
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-10 flex justify-center">
      <div className="flex gap-6 py-2">
        {lights.map((light) => (
          <div key={light.id} className="flex flex-col items-center">
            <div className="w-0.5 h-3 bg-christmas-green-dark" />
            <div
              className={`w-4 h-5 rounded-full ${light.color} animate-lights ornament`}
              style={{ 
                animationDelay: `${light.delay}s`,
                boxShadow: `0 0 15px currentColor, 0 0 30px currentColor`
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChristmasLights;
