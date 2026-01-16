
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
      title: 'December Casts',
      value: stats.totalCasts,
      funnyText: randomItem([
        `You dropped ${stats.totalCasts.toLocaleString()} casts this December.\nSanta saw every one.\nNo regrets. 🎅`,
        `${stats.totalCasts.toLocaleString()} casts in December.\nYou had thoughts.\nYou shared them.\nThe elves took notes.`,
        `${stats.totalCasts.toLocaleString()} casts.\nSome hit.\nSome missed.\nAll made Santa's list.`,
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
            `You pulled ${stats.replies.toLocaleString()} replies this December.\nFantastic energy detected.\nYou start movements, not arguments. 🎄`,
            `${stats.replies.toLocaleString()} replies.\nPeople couldn't resist responding.\nMain character December confirmed.`,
            `${stats.replies.toLocaleString()} replies in December.\nYou said things.\nPeople had opinions.\nChaos ensued.`,
          ])
        : randomItem([
            `${stats.replies.toLocaleString()} replies.\nQuality over quantity.\nSanta respects that.`,
            `${stats.replies.toLocaleString()} replies this December.\nSilent but powerful.\nThey're listening. 👀`,
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
            `${stats.recastsReceived.toLocaleString()} recasts.\nYour words didn't just land.\nThey traveled like Santa's sleigh. 🛷`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nPeople wanted to share your energy.\nInfluence: unlocked.`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nYou're not just posting.\nYou're spreading holiday vibes.`,
          ])
        : randomItem([
            `${stats.recastsReceived.toLocaleString()} recasts.\nYour vibe is catching on.\nSlow and steady wins the sleigh race. 🎿`,
            `${stats.recastsReceived.toLocaleString()} recasts.\nSeeds planted.\nWaiting for the Christmas bloom. 🌟`,
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
            `${stats.likesReceived.toLocaleString()} likes.\nPeople really like your December vibe.\nCharm: confirmed. ✨`,
            `${stats.likesReceived.toLocaleString()} likes in December.\nYou're basically a holiday legend around here.`,
            `${stats.likesReceived.toLocaleString()} likes.\nThe timeline smashed that heart button\nfor you. Repeatedly. 💙`,
          ])
        : randomItem([
            `${stats.likesReceived.toLocaleString()} likes.\nEach one earned.\nNot given.\nSanta approves. 🎅`,
            `${stats.likesReceived.toLocaleString()} likes.\nYour people found you.\nMore will follow in the new year.`,
          ]),
      emoji: '❤️',
      color: 'red',
    });

    // Slide 5: Active Days / Streak
    slideList.push({
      id: 'active-days',
      title: 'December Days',
      value: stats.activeDays,
      funnyText: stats.longestStreak >= 7
        ? randomItem([
            `You showed up ${stats.activeDays} days this December.\n${stats.longestStreak}-day streak.\nConsistency unlocked.\nVery nice behavior 💙`,
            `${stats.activeDays} active days.\n${stats.longestStreak} straight.\nThat's not posting.\nThat's holiday dedication.`,
            `${stats.activeDays} days.\nStreak: ${stats.longestStreak}.\nYou understood the December assignment. 🎄`,
          ])
        : stats.hasGapReturn
        ? randomItem([
            `You disappeared for a bit...\nThen came back loud.\nNaughty behavior confirmed 😈`,
            `${stats.activeDays} active days.\nYou took holiday breaks.\nYou returned stronger.\nRespect.`,
            `Vanished. Returned.\nThe timeline noticed.\nMain character December moment. ⭐`,
          ])
        : randomItem([
            `${stats.activeDays} days active.\nYou showed up.\nSanta noticed. 🎅`,
            `${stats.activeDays} days in December.\nNot every day.\nBut enough to make the nice list.`,
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
          `Your biggest December moment:\n${totalEngagement} total engagement.\n${stats.peakMoment.likes} ❤️ ${stats.peakMoment.recasts} 🔄 ${stats.peakMoment.replies} 💬\n\nThe internet shook briefly. ⚡`,
          `Peak December engagement: ${totalEngagement}\n\nOne cast.\nMaximum holiday chaos.\nYou did that.`,
          `${totalEngagement} engagement on your best December cast.\n\nSome people post.\nYou performed. 🌟`,
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
          `${stats.lateNightPosts} late-night December posts with high engagement.\n\nNaughty moment detected.\nChaos caused.\nNo regrets. 😈`,
          `You posted after midnight in December.\nPeople engaged.\n\nDangerous takes.\nZero remorse. 🌙`,
          `${stats.lateNightPosts} night owl December posts.\n\nThe best holiday takes\nhit after midnight. ⭐`,
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
        `Your peak December hour: ${formatHour(stats.mostActiveHour)}.\n\nThis is when you hit different.\nSanta's watching. 🎅`,
        `${formatHour(stats.mostActiveHour)} is your time.\n\nPrime December casting hours.\nMaximum holiday impact. 🎄`,
        `You post hardest at ${formatHour(stats.mostActiveHour)}.\n\nWe see the pattern.\nThe elves respect it. 🧝`,
      ]),
      emoji: '⏰',
      color: 'green',
    });

    return slideList;
  }, [stats]);

  return { slides, judgment };
};
