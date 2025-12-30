export interface MonthlyStats {
  fid: number;
  username: string;
  pfp: string;
  totalCasts: number;
  replies: number;
  likesReceived: number;
  recastsReceived: number;
  activeDays: number;
  longestStreak: number;
  mostActiveHour: number;
  mostRepliedCast: {
    text: string;
    repliesCount: number;
    timestamp: string;
  } | null;
  peakMoment: {
    text: string;
    likes: number;
    recasts: number;
    replies: number;
    timestamp: string;
  } | null;
  lateNightPosts: number;
  hasGapReturn: boolean;
  flavorTitles: string[];
  month: string;
  year: number;
}

export interface MonthlySlideContent {
  id: string;
  title: string;
  value: string | number;
  funnyText: string;
  emoji: string;
  color: 'red' | 'green' | 'gold' | 'purple';
}

export interface MonthlyJudgment {
  score: number;
  isNice: boolean;
  badge: string;
  nicePoints: number;
  naughtyPoints: number;
}
