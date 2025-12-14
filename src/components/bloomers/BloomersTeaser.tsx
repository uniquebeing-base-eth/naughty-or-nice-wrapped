import { useState, useEffect } from 'react';

const CREATURE_TYPES = [
  { emoji: '🧝', name: 'Enchanted Elf', desc: 'Magical helpers with holiday spirit' },
  { emoji: '🐉', name: 'Frost Dragon', desc: 'Guardians of winter wonder' },
  { emoji: '🧚', name: 'Starlight Fairy', desc: 'Keepers of Christmas magic' },
  { emoji: '🦊', name: 'Arctic Fox', desc: 'Swift and clever companions' },
  { emoji: '🦌', name: 'Golden Reindeer', desc: 'Noble creatures of the North' },
  { emoji: '🐱', name: 'Crystal Cat', desc: 'Mystical feline friends' },
  { emoji: '🦅', name: 'Phoenix', desc: 'Eternal flames of joy' },
  { emoji: '🐺', name: 'Snow Wolf', desc: 'Loyal protectors of peace' },
];

const BloomersTeaser = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % CREATURE_TYPES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-20 px-6">
      <div className="max-w-md mx-auto text-center">
        {/* Text */}
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-christmas-snow mb-4">
            Every Bloomer is <span className="text-christmas-gold">Unique</span>
          </h2>
          <p className="text-christmas-snow/60">
            Shaped by your actions. No two bloom alike.
          </p>
        </div>

        {/* Creature grid showcase */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {CREATURE_TYPES.map((creature, idx) => (
            <div
              key={creature.name}
              className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all duration-500 ${
                idx === activeIndex
                  ? 'bg-gradient-to-br from-christmas-gold/30 to-amber-600/20 scale-110 shadow-lg shadow-christmas-gold/30'
                  : 'bg-muted/30 opacity-60'
              }`}
            >
              {creature.emoji}
            </div>
          ))}
        </div>

        {/* Active creature description */}
        <div className="christmas-card p-4 border border-christmas-gold/20 transition-all duration-500">
          <p className="text-2xl mb-2">{CREATURE_TYPES[activeIndex].emoji}</p>
          <p className="font-display text-lg text-christmas-gold font-semibold">
            {CREATURE_TYPES[activeIndex].name}
          </p>
          <p className="text-christmas-snow/60 text-sm">
            {CREATURE_TYPES[activeIndex].desc}
          </p>
        </div>

        {/* Traits preview */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {['Glowing Aura', 'Crystal Wings', 'Golden Markings', 'Starry Eyes'].map((trait) => (
            <span 
              key={trait}
              className="px-3 py-1 rounded-full bg-muted/30 border border-christmas-gold/20 text-christmas-snow/70 text-xs"
            >
              {trait}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BloomersTeaser;
