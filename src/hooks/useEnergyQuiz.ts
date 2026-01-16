
import { useState, useMemo, useCallback } from 'react';
import { 
  EnergyType, 
  EnergyPersonality, 
  QuizAnswer, 
  QUIZ_QUESTIONS, 
  ENERGY_PERSONALITIES 
} from '@/types/energy';

export const useEnergyQuiz = () => {
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isQuizComplete, setIsQuizComplete] = useState(false);

  const currentQuestion = QUIZ_QUESTIONS[currentQuestionIndex];
  const totalQuestions = QUIZ_QUESTIONS.length;

  const selectAnswer = useCallback((optionLabel: string) => {
    const newAnswer: QuizAnswer = {
      questionId: currentQuestion.id,
      selectedOption: optionLabel,
    };

    setAnswers(prev => {
      const existing = prev.findIndex(a => a.questionId === currentQuestion.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newAnswer;
        return updated;
      }
      return [...prev, newAnswer];
    });

    // Auto-advance to next question after a brief delay
    setTimeout(() => {
      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        setIsQuizComplete(true);
      }
    }, 400);
  }, [currentQuestion, currentQuestionIndex, totalQuestions]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }, [currentQuestionIndex]);

  const calculateResult = useMemo((): EnergyPersonality | null => {
    if (!isQuizComplete) return null;

    // Initialize scores for all energy types
    const scores: Record<EnergyType, number> = {
      'main-character-energy': 0,
      'quiet-power': 0,
      'magnetic-chaos': 0,
      'golden-aura': 0,
      'built-different': 0,
      'glow-up-loading': 0,
      'strategic-star': 0,
      'rare-frequency': 0,
    };

    // Calculate scores based on answers
    answers.forEach(answer => {
      const question = QUIZ_QUESTIONS.find(q => q.id === answer.questionId);
      if (!question) return;

      const selectedOption = question.options.find(o => o.label === answer.selectedOption);
      if (!selectedOption) return;

      // Add 1 point to each energy type associated with this option
      selectedOption.energies.forEach(energy => {
        scores[energy] += 1;
      });
    });

    // Find the highest score(s)
    const maxScore = Math.max(...Object.values(scores));
    const topEnergies = (Object.entries(scores) as [EnergyType, number][])
      .filter(([_, score]) => score === maxScore)
      .map(([energy]) => energy);

    // If there's a tie, pick randomly
    const winningEnergy = topEnergies[Math.floor(Math.random() * topEnergies.length)];

    return ENERGY_PERSONALITIES[winningEnergy];
  }, [answers, isQuizComplete]);

  const resetQuiz = useCallback(() => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setIsQuizComplete(false);
  }, []);

  const getSelectedAnswer = useCallback((questionId: number): string | null => {
    const answer = answers.find(a => a.questionId === questionId);
    return answer?.selectedOption ?? null;
  }, [answers]);

  return {
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isQuizComplete,
    result: calculateResult,
    selectAnswer,
    goToPreviousQuestion,
    resetQuiz,
    getSelectedAnswer,
    answers,
  };
};
