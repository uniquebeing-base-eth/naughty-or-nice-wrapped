import { useMemo } from 'react';
import { MonthlyStats, MonthlySlideContent, MonthlyJudgment } from '@/types/monthly';

const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const formatHour = (hour: number): string => {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
};

export const useMonthlyWrappedData = (stats: MonthlyStats, savedJudgment?: MonthlyJudgment | null) => {
  
  const judgment: MonthlyJudgment = useMemo(() => {
    if (savedJudgment) return savedJudgment;
    
    // Fallback judgment if not provided
    const isNice = Math.random() < 0.65;
    const score = isNice 
      ? 75 + Math.floor(Math.random() * 24)
      : 20 + Math.floor(Math.random() * 16);
    
    const niceBadges = ['Community Angel', 'Engagement Hero', 'Good Vibes Only', 'Timeline Blessing'];
    const naughtyBadges = ['Timeline Terror', 'Chaos Agent', 'Main Character', 'Unhinged Energy'];
    const badges = isNice ? niceBadges : naughtyBadges;
    
    return {
      score,
      isNice,
      badge: randomItem(badges),
      nicePoints: isNice ? 3000 + Math.floor(Math.random() * 5000) : 500 + Math.floor(Math.random() * 1500),
      naughtyPoints: isNice ? 50 + Math.floor(Math.random() * 150) : 300 + Math.floor(Math.random() * 500),
    };
  }, [savedJudgment]);

  const slides: MonthlySlideContent[] = useMemo(() => {
    const slideList: MonthlySlideContent[] = [];

    // Slide 1: Total Casts
    slideList.push({
      id: 'total-casts',
      title: `${stats.month} Casts`,
      value: stats.totalCasts,
      funnyText: randomItem([
        `You dropped ${stats.totalCasts.toLocaleString()} casts this month.\nThat's not posting.\nThat's a lifestyle.`,
        `${stats.totalCasts.toLocaleString()} casts in ${stats.month}.\nYou had thoughts.\nYou shared them.\nNo regrets.`,
        `${stats.totalCasts.toLocaleString()} casts.\nSome hit.\nSome missed.\nAll iconic.`,
      ]),
      emoji: '📢',
      color: 'purple',
    });

    // Slide 2: Replies Received
    slideList.push({
      id: 'replies-received',
      title: 'Replies Received',
      value: stats.replies,
      funnyText: stats.replies > 50 
        ? randomItem([
            `You pulled ${stats.replies.toLocaleString()} replies this month.\nFantastic energy detected.\nYou don't talk at people —\nyou start movements.`,
            `${stats.replies.toLocaleString()} replies.\nPeople can't stop responding to you.\nMain character behavior confirmed.`,
            `${stats.replies.toLocaleString()} replies in ${stats.month}.\nYou said things.\nPeople had opinions.\nThe timeline was never the same.`,
          ])
        : randomItem([
            `${stats.replies.toLocaleString()} replies.\nQuality over quantity.\nYou made them count.`,
            `${stats.replies.toLocaleString()} replies this month.\nSilent but powerful.\nThey're listening.`,
          ]),
      emoji: '💬',
      color: 'gold',
    });

    // Slide 3: Recasts Received
    slideList.push({
      id: 'recasts-received',
      title: 'Recasts',
      value: stats.recastsReceived,
      funnyText: stats.recastsReceived > 50
        ? randomItem([
            `${stats.recastsReceived.toLocaleString()} recasts.\nYour words didn't just land.\nThey traveled.`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nPeople wanted to share your energy.\nInfluence unlocked.`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nYou're not just posting.\nYou're spreading culture.`,
          ])
        : randomItem([
            `${stats.recastsReceived.toLocaleString()} recasts.\nYour vibe is catching on.\nSlow and steady wins.`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nSeeds planted.\nWaiting for bloom.`,
          ]),
      emoji: '🔄',
      color: 'green',
    });

    // Slide 4: Likes Received
    slideList.push({
      id: 'likes-received',
      title: 'Likes',
      value: stats.likesReceived,
      funnyText: stats.likesReceived > 100
        ? randomItem([
            `${stats.likesReceived.toLocaleString()} likes.\nPeople really like your vibe.\nCharm: confirmed.`,
            `${stats.likesReceived.toLocaleString()} likes in ${stats.month}.\nYou're lowkey famous around here.`,
            `${stats.likesReceived.toLocaleString()} likes.\nThe timeline smashed that heart button\nfor you. Repeatedly.`,
          ])
        : randomItem([
            `${stats.likesReceived.toLocaleString()} likes.\nEach one earned.\nNot given.`,
            `${stats.likesReceived.toLocaleString()} likes.\nYour people found you.\nMore will follow.`,
          ]),
      emoji: '❤️',
      color: 'red',
    });

    // Slide 5: Active Days / Streak
    slideList.push({
      id: 'active-days',
      title: 'Posting Streak',
      value: stats.activeDays,
      funnyText: stats.longestStreak >= 7
        ? randomItem([
            `You showed up ${stats.activeDays} days this month.\n${stats.longestStreak}-day streak.\nConsistency unlocked.\nVery nice behavior 💙`,
            `${stats.activeDays} active days.\n${stats.longestStreak} straight.\nThat's not posting.\nThat's commitment.`,
            `${stats.activeDays} days.\nStreak: ${stats.longestStreak}.\nYou understood the assignment.`,
          ])
        : stats.hasGapReturn
        ? randomItem([
            `You disappeared for a bit...\nThen came back loud.\nNaughty behavior confirmed 😈`,
            `${stats.activeDays} active days.\nYou took breaks.\nYou returned stronger.\nRespect.`,
            `Vanished. Returned.\nThe timeline noticed.\nMain character moment.`,
          ])
        : randomItem([
            `${stats.activeDays} days active.\nYou showed up.\nThat's what matters.`,
            `${stats.activeDays} days in ${stats.month}.\nNot every day.\nBut enough days.`,
          ]),
      emoji: '🔥',
      color: 'gold',
    });

    // Slide 6: Peak Moment (if exists)
    if (stats.peakMoment && stats.peakMoment.likes + stats.peakMoment.recasts > 20) {
      const totalEngagement = stats.peakMoment.likes + stats.peakMoment.recasts + stats.peakMoment.replies;
      slideList.push({
        id: 'peak-moment',
        title: 'Peak Moment',
        value: totalEngagement,
        funnyText: randomItem([
          `Your biggest moment:\n${totalEngagement} total engagement.\n${stats.peakMoment.likes} ❤️ ${stats.peakMoment.recasts} 🔄 ${stats.peakMoment.replies} 💬\n\nThe internet shook briefly.`,
          `Peak engagement: ${totalEngagement}\n\nOne cast.\nMaximum chaos.\nYou did that.`,
          `${totalEngagement} engagement on your best cast.\n\nSome people post.\nYou performed.`,
        ]),
        emoji: '⚡',
        color: 'purple',
      });
    }

    // Slide 7: Naughty/Nice Moment Flavor
    if (stats.lateNightPosts > 3) {
      slideList.push({
        id: 'late-night',
        title: 'Late Night Energy',
        value: stats.lateNightPosts,
        funnyText: randomItem([
          `${stats.lateNightPosts} late-night posts with high engagement.\n\nNaughty moment detected.\nChaos caused.\nNo regrets.`,
          `You posted after midnight.\nPeople engaged.\n\nDangerous takes.\nZero remorse.`,
          `${stats.lateNightPosts} night owl posts.\n\nThe best ideas hit\nat the worst hours.`,
        ]),
        emoji: '🌙',
        color: 'purple',
      });
    }

    // Slide 8: Most Active Hour
    slideList.push({
      id: 'most-active-hour',
      title: 'Your Hour',
      value: formatHour(stats.mostActiveHour),
      funnyText: randomItem([
        `Your peak hour: ${formatHour(stats.mostActiveHour)}.\n\nThis is when you hit different.\nThe timeline knows.`,
        `${formatHour(stats.mostActiveHour)} is your time.\n\nPrime casting hours.\nMaximum impact.`,
        `You post hardest at ${formatHour(stats.mostActiveHour)}.\n\nWe see the pattern.\nWe respect it.`,
      ]),
      emoji: '⏰',
      color: 'green',
    });

    return slideList;
  }, [stats]);

  return { slides, judgment };
};
