import { useMemo } from 'react';
import { UserStats, SlideContent, JudgmentResult } from '@/types/wrapped';

// Mock data for demo - replace with Neynar API calls
export const mockUserStats: UserStats = {
  fid: 12345,
  username: 'uniquebeing404',
  pfp: 'https://api.dicebear.com/7.x/avataaars/svg?seed=uniquebeing404',
  replies: 342,
  likesGiven: 1289,
  likesReceived: 2156,
  recastsGiven: 456,
  recastsReceived: 789,
  activeDays: 247,
  silentDays: 118,
  timeframe: 'year',
};

export const useWrappedData = (stats: UserStats) => {
  const naughtyPoints = Math.round(stats.replies * 0.2);
  const nicePoints = stats.likesGiven + stats.recastsGiven;
  
  const judgment: JudgmentResult = useMemo(() => {
    const totalPoints = nicePoints + naughtyPoints;
    const score = totalPoints > 0 ? Math.round((nicePoints / totalPoints) * 100) : 50;
    const isNice = score >= 60;
    
    const niceBadges = ['Snowflake Saint', 'Gift Giver', 'Holiday Hero', 'Jolly Elf'];
    const naughtyBadges = ['North Pole Rebel', 'Gingerbread Menace', 'Elf Disturber', 'Silent Night Sinner'];
    
    const badges = isNice ? niceBadges : naughtyBadges;
    const badge = badges[Math.floor(Math.random() * badges.length)];
    
    return { score, isNice, badge, nicePoints, naughtyPoints };
  }, [nicePoints, naughtyPoints]);

  const slides: SlideContent[] = useMemo(() => [
    {
      id: 'replies',
      title: 'Replies Sent',
      value: stats.replies,
      cleanText: `You sent ${stats.replies.toLocaleString()} replies this year.`,
      funnyText: `You sent ${stats.replies.toLocaleString()} replies…\nSome sweet, some chaotic, all unforgettable 😈😂`,
      alternates: [
        'Certified Farcaster chatterbox.',
        'Elf-level typing stamina.',
        'You simply refuse to keep quiet.',
      ],
      emoji: '💬',
      color: 'red',
    },
    {
      id: 'likes-given',
      title: 'Likes Given',
      value: stats.likesGiven,
      cleanText: `You gave ${stats.likesGiven.toLocaleString()} likes.`,
      funnyText: `You gave ${stats.likesGiven.toLocaleString()} likes 🎁\nYour thumb deserves a Christmas bonus.`,
      alternates: [
        'Love distributor of the North Pole.',
        'Generous elf energy.',
        'Santa approves your kindness.',
      ],
      emoji: '❤️',
      color: 'green',
    },
    {
      id: 'likes-received',
      title: 'Likes Received',
      value: stats.likesReceived,
      cleanText: `You received ${stats.likesReceived.toLocaleString()} likes.`,
      funnyText: `You received ${stats.likesReceived.toLocaleString()} likes ❄️\nYour casts sparkle with Christmas magic.`,
      alternates: [
        "You're basically Farcaster's Rudolph.",
        'People REALLY like your vibe.',
        'Santa is jealous of your engagement.',
      ],
      emoji: '✨',
      color: 'gold',
    },
    {
      id: 'recasts-given',
      title: 'Recasts Given',
      value: stats.recastsGiven,
      cleanText: `You recasted ${stats.recastsGiven.toLocaleString()} posts.`,
      funnyText: `You recasted ${stats.recastsGiven.toLocaleString()} posts 🎄\nSharing is caring — certified community elf.`,
      alternates: [
        'North Pole signal booster.',
        'Gift-giver behavior.',
        'Your recasts keep the sleigh running.',
      ],
      emoji: '🔄',
      color: 'green',
    },
    {
      id: 'active-days',
      title: 'Active Days',
      value: stats.activeDays,
      cleanText: `You were active for ${stats.activeDays} days.`,
      funnyText: `You posted for ${stats.activeDays} days straight ❄️\nDedication level: Santa-before-Christmas.`,
      alternates: [
        'Consistency colder than the North Pole.',
        'Elf work ethic unlocked.',
        'The Farcaster grind never sleeps.',
      ],
      emoji: '📅',
      color: 'gold',
    },
    {
      id: 'silent-days',
      title: 'Silent Days',
      value: stats.silentDays,
      cleanText: `You were inactive for ${stats.silentDays} days.`,
      funnyText: `You disappeared for ${stats.silentDays} days 😴\nSanta thought you melted.`,
      alternates: [
        'Elf PTO detected.',
        'Holiday hibernation mode.',
        'Ghost of Christmas Past.',
      ],
      emoji: '🌙',
      color: 'red',
    },
    {
      id: 'naughty-moments',
      title: 'Naughty Moments',
      value: naughtyPoints,
      cleanText: `You had ${naughtyPoints} naughty moments.`,
      funnyText: `You dropped ${naughtyPoints} spicy replies 😈\nElf Committee is reviewing your case…`,
      alternates: [
        'Chaos levels rising.',
        'North Pole incident report filed.',
        'Gingerbread crimes detected.',
      ],
      emoji: '😈',
      color: 'red',
    },
    {
      id: 'nice-moments',
      title: 'Nice Moments',
      value: nicePoints,
      cleanText: `You had ${nicePoints.toLocaleString()} nice moments.`,
      funnyText: `You created ${nicePoints.toLocaleString()} moments of joy 🎁\nSanta is proud.`,
      alternates: [
        'Pure holiday spirit.',
        'Certified giver.',
        'Warm cocoa energy.',
      ],
      emoji: '🎁',
      color: 'green',
    },
  ], [stats, naughtyPoints, nicePoints]);

  return { slides, judgment, naughtyPoints, nicePoints };
};
