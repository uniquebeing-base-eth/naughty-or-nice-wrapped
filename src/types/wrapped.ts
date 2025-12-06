export interface UserStats {
  fid: number;
  username: string;
  pfp: string;
  replies: number;
  likesGiven: number;
  likesReceived: number;
  recastsGiven: number;
  recastsReceived: number;
  activeDays: number;
  silentDays: number;
  timeframe: 'month' | 'year';
}

export interface SlideContent {
  id: string;
  title: string;
  value: string | number;
  cleanText: string;
  funnyText: string;
  alternates: string[];
  emoji: string;
  color: 'red' | 'green' | 'gold';
}

export interface JudgmentResult {
  score: number;
  isNice: boolean;
  badge: string;
  nicePoints: number;
  naughtyPoints: number;
}

export type SlideType = 
  | 'welcome'
  | 'replies'
  | 'likes-given'
  | 'likes-received'
  | 'recasts-given'
  | 'active-days'
  | 'silent-days'
  | 'naughty-moments'
  | 'nice-moments'
  | 'judgment';
