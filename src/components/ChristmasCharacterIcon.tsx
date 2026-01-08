
interface ChristmasCharacterIconProps {
  emoji: string;
  className?: string;
}

// Maps each stat emoji to a cute Christmas character hugging it
const characterMap: Record<string, { character: string; position: 'left' | 'right' | 'bottom' }> = {
  '❤️': { character: '🧝', position: 'right' },      // Elf hugging heart (likes given)
  '💕': { character: '🎅', position: 'left' },       // Santa hugging hearts (likes received)  
  '🔁': { character: '⛄', position: 'right' },      // Snowman hugging recast
  '🎁': { character: '🧝‍♀️', position: 'left' },      // Female elf hugging gift (recasts received)
  '💬': { character: '🦌', position: 'right' },      // Reindeer with speech bubble (replies)
  '☀️': { character: '🤶', position: 'left' },       // Mrs Claus with sun (active days)
  '🌙': { character: '🐧', position: 'right' },      // Penguin with moon (silent days)
};

const ChristmasCharacterIcon = ({ emoji, className = '' }: ChristmasCharacterIconProps) => {
  const characterInfo = characterMap[emoji] || { character: '🧝', position: 'right' };
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      {/* Main emoji */}
      <span className="text-7xl relative z-10">{emoji}</span>
      
      {/* Christmas character hugging the emoji */}
      <span 
        className={`absolute text-4xl z-20 animate-wiggle ${
          characterInfo.position === 'left' 
            ? '-left-6 top-1/2 -translate-y-1/2 -rotate-12' 
            : characterInfo.position === 'right'
            ? '-right-6 top-1/2 -translate-y-1/2 rotate-12'
            : 'bottom-0 left-1/2 -translate-x-1/2 translate-y-2'
        }`}
      >
        {characterInfo.character}
      </span>
      
      {/* Little arms/hugging effect with sparkles */}
      <span 
        className={`absolute text-xl opacity-80 animate-pulse ${
          characterInfo.position === 'left' 
            ? 'left-4 top-1/2 -translate-y-1/2' 
            : characterInfo.position === 'right'
            ? 'right-4 top-1/2 -translate-y-1/2'
            : 'bottom-4 left-1/2 -translate-x-1/2'
        }`}
      >
        ✨
      </span>
    </div>
  );
};

export default ChristmasCharacterIcon;
