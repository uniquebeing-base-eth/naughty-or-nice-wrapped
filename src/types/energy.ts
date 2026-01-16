
export type EnergyType =
  | 'main-character-energy'
  | 'quiet-power'
  | 'magnetic-chaos'
  | 'golden-aura'
  | 'built-different'
  | 'glow-up-loading'
  | 'strategic-star'
  | 'rare-frequency';

export interface EnergyPersonality {
  id: EnergyType;
  name: string;
  emoji: string;
  reveal: string[];
  predictions: string[];
  affirmation: string;
  shareCaption: string;
  gradient: string;
  glowColor: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: {
    label: string;
    text: string;
    energies: EnergyType[];
  }[];
}

export interface QuizAnswer {
  questionId: number;
  selectedOption: string;
}

export const ENERGY_PERSONALITIES: Record<EnergyType, EnergyPersonality> = {
  'main-character-energy': {
    id: 'main-character-energy',
    name: 'Main Character Energy',
    emoji: '👑',
    reveal: [
      'You naturally draw attention without trying.',
      'Your presence changes the tone of any space you enter.',
      'Things tend to happen around you, not to you.',
    ],
    predictions: [
      'Things flow toward you naturally.',
      'People will notice you in unexpected ways.',
      "Doors you didn't even knock on will open.",
    ],
    affirmation: "You're at the center of your story. Everything is aligning.",
    shareCaption: "doors are opening I didn't even knock on.",
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    glowColor: 'purple',
  },
  'quiet-power': {
    id: 'quiet-power',
    name: 'Quiet Power',
    emoji: '🌙',
    reveal: [
      "You don't say much, but when you move, people notice.",
      'You observe first, then act with precision.',
      'Your calm hides serious capability.',
    ],
    predictions: [
      'Challenges will reveal your strength effortlessly.',
      'Moments of silence will give you clarity others envy.',
      'Small moves now set the stage for big impact.',
    ],
    affirmation: 'Your quiet power is louder than you realize.',
    shareCaption: 'calm is louder than people realize.',
    gradient: 'from-slate-600 via-slate-500 to-slate-400',
    glowColor: 'slate',
  },
  'magnetic-chaos': {
    id: 'magnetic-chaos',
    name: 'Magnetic Chaos',
    emoji: '⚡',
    reveal: [
      'Your energy is unpredictable in the best way.',
      'You turn randomness into opportunity.',
      "People never know what you'll do next — and that's your power.",
    ],
    predictions: [
      'Surprising situations favor you.',
      'Unexpected collaborations spark your next win.',
      'Your energy attracts bold, like-minded people.',
    ],
    affirmation: 'Chaos is your secret superpower.',
    shareCaption: 'chaos really is my superpower.',
    gradient: 'from-orange-500 via-amber-500 to-yellow-500',
    glowColor: 'orange',
  },
  'golden-aura': {
    id: 'golden-aura',
    name: 'Golden Aura',
    emoji: '✨',
    reveal: [
      'You carry warmth that pulls people in.',
      'Opportunities show up through connection.',
      'Your kindness keeps opening doors.',
    ],
    predictions: [
      "Connections you didn't plan will empower you.",
      "Trust will open doors that logic can't reach.",
      'Your vibe multiplies opportunities silently.',
    ],
    affirmation: 'Keep glowing — the universe notices.',
    shareCaption: 'my vibe multiplies opportunities silently.',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    glowColor: 'gold',
  },
  'built-different': {
    id: 'built-different',
    name: 'Built Different',
    emoji: '💎',
    reveal: [
      "You don't follow standard paths.",
      "You survive things others wouldn't and come out sharper.",
      "Your story is still unfolding, and it's going to surprise people.",
    ],
    predictions: [
      'Situations that break others will strengthen you.',
      'People will turn to you for guidance before they know why.',
      'Your story inspires silently but powerfully.',
    ],
    affirmation: "You're forging a path only you can walk.",
    shareCaption: 'forging a path only I can walk.',
    gradient: 'from-teal-400 via-cyan-400 to-sky-400',
    glowColor: 'teal',
  },
  'glow-up-loading': {
    id: 'glow-up-loading',
    name: 'Glow-Up Loading',
    emoji: '🦋',
    reveal: [
      "You're in a transition phase that others can feel.",
      'Something about you is shifting fast.',
      'The next version of you arrives sooner than expected.',
    ],
    predictions: [
      'Subtle shifts will soon reveal bigger change.',
      'Hidden talents emerge when you least expect them.',
      'Energy aligns around your next growth phase.',
    ],
    affirmation: "Keep moving — your glow-up is unstoppable.",
    shareCaption: 'transformation is quietly happening, and I can feel it.',
    gradient: 'from-pink-400 via-rose-400 to-fuchsia-500',
    glowColor: 'pink',
  },
  'strategic-star': {
    id: 'strategic-star',
    name: 'Strategic Star',
    emoji: '🎯',
    reveal: [
      'You see the bigger picture while others chase moments.',
      'Your timing is your secret weapon.',
      'When you commit, results follow.',
    ],
    predictions: [
      'Timing favors your decisions in surprising ways.',
      "Opportunities appear just as you're ready.",
      'Influence grows faster than effort alone predicts.',
    ],
    affirmation: 'Strategy + instinct = unstoppable momentum.',
    shareCaption: "timing is everything, and it's favoring me.",
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    glowColor: 'emerald',
  },
  'rare-frequency': {
    id: 'rare-frequency',
    name: 'Rare Frequency',
    emoji: '🔮',
    reveal: [
      "Not everyone understands you — and that's fine.",
      'Your energy resonates with the right people at the right time.',
      'When alignment happens, things move quickly.',
    ],
    predictions: [
      'Unexpected synchronicities bring doors into view.',
      'Your intuition guides choices that feel like magic.',
      'The right collaborations appear at the perfect moment.',
    ],
    affirmation: 'Your frequency is rare — and powerful.',
    shareCaption: 'the right energy finds me at the perfect moment.',
    gradient: 'from-violet-500 via-purple-500 to-indigo-500',
    glowColor: 'violet',
  },
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'When something unexpected happens, you usually',
    options: [
      { label: 'A', text: 'Turn it into a win', energies: ['main-character-energy', 'glow-up-loading'] },
      { label: 'B', text: 'Panic for 2 seconds, then adapt', energies: ['quiet-power', 'strategic-star'] },
      { label: 'C', text: 'Laugh and go with it', energies: ['magnetic-chaos', 'golden-aura'] },
      { label: 'D', text: 'Act like you predicted it', energies: ['rare-frequency', 'built-different'] },
    ],
  },
  {
    id: 2,
    question: 'People closest to you know that you',
    options: [
      { label: 'A', text: 'Think deeply', energies: ['strategic-star', 'rare-frequency'] },
      { label: 'B', text: 'Feel deeply', energies: ['golden-aura', 'glow-up-loading'] },
      { label: 'C', text: 'Move unpredictably', energies: ['magnetic-chaos', 'main-character-energy'] },
      { label: 'D', text: 'Always find a way', energies: ['built-different', 'quiet-power'] },
    ],
  },
  {
    id: 3,
    question: 'Your energy this year has been more',
    options: [
      { label: 'A', text: 'Focused', energies: ['quiet-power', 'strategic-star'] },
      { label: 'B', text: 'Restless', energies: ['magnetic-chaos', 'rare-frequency'] },
      { label: 'C', text: 'Magnetic', energies: ['main-character-energy', 'glow-up-loading'] },
      { label: 'D', text: 'Resilient', energies: ['built-different', 'golden-aura'] },
    ],
  },
  {
    id: 4,
    question: 'When you want something, you',
    options: [
      { label: 'A', text: 'Plan quietly', energies: ['quiet-power', 'strategic-star'] },
      { label: 'B', text: 'Chase it boldly', energies: ['main-character-energy', 'magnetic-chaos'] },
      { label: 'C', text: 'Let it come to you', energies: ['golden-aura', 'glow-up-loading'] },
      { label: 'D', text: 'Create your own path', energies: ['built-different', 'rare-frequency'] },
    ],
  },
  {
    id: 5,
    question: 'Right now, your life feels like',
    options: [
      { label: 'A', text: 'A calm before a shift', energies: ['main-character-energy', 'strategic-star'] },
      { label: 'B', text: 'Controlled chaos', energies: ['magnetic-chaos', 'rare-frequency'] },
      { label: 'C', text: 'A glow-up loading', energies: ['glow-up-loading', 'golden-aura'] },
      { label: 'D', text: 'The start of something big', energies: ['built-different', 'quiet-power'] },
    ],
  },
];
