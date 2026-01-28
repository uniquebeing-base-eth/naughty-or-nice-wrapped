

import { useEffect, useState } from 'react';
import { QuizQuestion } from '@/types/energy';
import { Sparkles } from 'lucide-react';

interface EnergyQuizSlideProps {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onSelectAnswer: (optionLabel: string) => void;
}

const EnergyQuizSlide = ({ 
  question, 
  questionIndex, 
  totalQuestions,
  selectedAnswer,
  onSelectAnswer 
}: EnergyQuizSlideProps) => {
  const [animate, setAnimate] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    setAnimate(false);
    setSelectedOption(null);
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [question.id]);

  const handleSelect = (label: string) => {
    setSelectedOption(label);
    onSelectAnswer(label);
  };

  const optionColors = [
    'from-purple-500 to-pink-500',
    'from-cyan-500 to-blue-500',
    'from-emerald-500 to-teal-500',
    'from-orange-500 to-amber-500',
  ];

  return (
    <div className="flex flex-col items-center justify-start min-h-[75vh] text-center px-4 pt-4">
      {/* Header */}
      <div className={`mb-6 transition-all duration-500 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium uppercase tracking-wider">
            Energy Personality Test
          </span>
          <Sparkles className="w-5 h-5 text-purple-400" />
        </div>
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalQuestions }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                i < questionIndex
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                  : i === questionIndex
                  ? 'bg-purple-400 animate-pulse'
                  : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Question Card */}
      <div 
        className={`christmas-card border-2 border-purple-500/30 w-full max-w-sm transition-all duration-700 shadow-[0_0_80px_hsl(280_70%_50%/0.4)] ${
          animate ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Decorative elements */}
        <div className="absolute -top-3 -left-3 text-2xl">🔮</div>
        <div className="absolute -top-3 -right-3 text-2xl">✨</div>
        
        {/* Question number */}
        <div className={`text-xs text-purple-300 font-medium uppercase tracking-widest mb-4 transition-all duration-500 delay-100 ${animate ? 'opacity-100' : 'opacity-0'}`}>
          Question {questionIndex + 1} of {totalQuestions}
        </div>

        {/* Question text */}
        <h2 className={`font-display text-xl font-bold text-christmas-snow mb-6 leading-relaxed transition-all duration-500 delay-200 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {question.question}
        </h2>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedOption === option.label || selectedAnswer === option.label;
            
            return (
              <button
                key={option.label}
                onClick={() => handleSelect(option.label)}
                disabled={selectedOption !== null}
                className={`w-full p-4 rounded-xl text-left transition-all duration-300 border-2 ${
                  isSelected
                    ? `bg-gradient-to-r ${optionColors[index]} text-white border-transparent scale-[1.02]`
                    : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20 text-christmas-snow'
                } ${animate ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}
                style={{ transitionDelay: `${300 + index * 100}ms` }}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    isSelected ? 'bg-white/20' : 'bg-white/10'
                  }`}>
                    {option.label}
                  </span>
                  <span className="font-medium">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Magical footer text */}
      <p className={`mt-6 text-sm text-purple-300/70 italic transition-all duration-500 delay-700 ${animate ? 'opacity-100' : 'opacity-0'}`}>
        Trust your instinct ✨
      </p>
    </div>
  );
};

export default EnergyQuizSlide;
