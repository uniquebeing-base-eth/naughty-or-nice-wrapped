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

// Helper to get random item from array
const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

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
    const badge = randomItem(badges);
    
    return { score, isNice, badge, nicePoints, naughtyPoints };
  }, [nicePoints, naughtyPoints]);

  const slides: SlideContent[] = useMemo(() => [
    {
      id: 'replies',
      title: 'Replies Sent',
      value: stats.replies,
      cleanText: `You sent ${stats.replies.toLocaleString()} replies this year.`,
      funnyText: randomItem([
        `You sent ${stats.replies.toLocaleString()} replies…\nSome sweet, some chaotic, all unforgettable 😈`,
        `${stats.replies.toLocaleString()} replies!\nCertified Farcaster chatterbox 💬`,
        `${stats.replies.toLocaleString()} replies dropped!\nElf-level typing stamina 🧝`,
        `You simply refuse to keep quiet.\n${stats.replies.toLocaleString()} replies and counting! 🔥`,
      ]),
      alternates: [],
      emoji: '💬',
      color: 'red',
    },
    {
      id: 'likes-given',
      title: 'Likes Given',
      value: stats.likesGiven,
      cleanText: `You gave ${stats.likesGiven.toLocaleString()} likes.`,
      funnyText: randomItem([
        `You gave ${stats.likesGiven.toLocaleString()} likes 🎁\nYour thumb deserves a Christmas bonus!`,
        `${stats.likesGiven.toLocaleString()} likes!\nLove distributor of the North Pole ❄️`,
        `Generous elf energy detected!\n${stats.likesGiven.toLocaleString()} hearts spread 💚`,
        `Santa approves your kindness.\n${stats.likesGiven.toLocaleString()} likes given! 🎅`,
      ]),
      alternates: [],
      emoji: '❤️',
      color: 'green',
    },
    {
      id: 'likes-received',
      title: 'Likes Received',
      value: stats.likesReceived,
      cleanText: `You received ${stats.likesReceived.toLocaleString()} likes.`,
      funnyText: randomItem([
        `You received ${stats.likesReceived.toLocaleString()} likes ⭐\nYour casts sparkle with Christmas magic!`,
        `${stats.likesReceived.toLocaleString()} likes received!\nYou're basically Farcaster's Rudolph 🦌`,
        `People REALLY like your vibe.\n${stats.likesReceived.toLocaleString()} hearts! 💛`,
        `Santa is jealous of your engagement.\n${stats.likesReceived.toLocaleString()} likes! ✨`,
      ]),
      alternates: [],
      emoji: '✨',
      color: 'gold',
    },
    {
      id: 'recasts-given',
      title: 'Recasts Given',
      value: stats.recastsGiven,
      cleanText: `You recasted ${stats.recastsGiven.toLocaleString()} posts.`,
      funnyText: randomItem([
        `You recasted ${stats.recastsGiven.toLocaleString()} posts 🎄\nSharing is caring — certified community elf!`,
        `North Pole signal booster!\n${stats.recastsGiven.toLocaleString()} recasts 📡`,
        `Gift-giver behavior unlocked.\n${stats.recastsGiven.toLocaleString()} posts shared! 🎁`,
        `Your recasts keep the sleigh running!\n${stats.recastsGiven.toLocaleString()} boosts 🛷`,
      ]),
      alternates: [],
      emoji: '🔄',
      color: 'green',
    },
    {
      id: 'active-days',
      title: 'Active Days',
      value: stats.activeDays,
      cleanText: `You were active for ${stats.activeDays} days.`,
      funnyText: randomItem([
        `You posted for ${stats.activeDays} days straight ❄️\nDedication level: Santa-before-Christmas!`,
        `${stats.activeDays} active days!\nConsistency colder than the North Pole 🏔️`,
        `Elf work ethic unlocked!\n${stats.activeDays} days of grinding 💪`,
        `The Farcaster grind never sleeps.\n${stats.activeDays} days strong! 🔥`,
      ]),
      alternates: [],
      emoji: '📅',
      color: 'gold',
    },
    {
      id: 'silent-days',
      title: 'Silent Days',
      value: stats.silentDays,
      cleanText: `You were inactive for ${stats.silentDays} days.`,
      funnyText: randomItem([
        `You disappeared for ${stats.silentDays} days 😴\nSanta thought you melted!`,
        `${stats.silentDays} silent days!\nElf PTO detected 🏖️`,
        `Holiday hibernation mode.\n${stats.silentDays} days offline 💤`,
        `Ghost of Christmas Past!\n${stats.silentDays} days MIA 👻`,
      ]),
      alternates: [],
      emoji: '🌙',
      color: 'red',
    },
    {
      id: 'naughty-moments',
      title: 'Naughty Moments',
      value: naughtyPoints,
      cleanText: `You had ${naughtyPoints} naughty moments.`,
      funnyText: randomItem([
        `You dropped ${naughtyPoints} spicy replies 😈\nElf Committee is reviewing your case…`,
        `${naughtyPoints} naughty moments!\nChaos levels rising 🔥`,
        `North Pole incident report filed.\n${naughtyPoints} violations detected! 📋`,
        `Gingerbread crimes detected!\n${naughtyPoints} spicy moments 🍪`,
      ]),
      alternates: [],
      emoji: '😈',
      color: 'red',
    },
    {
      id: 'nice-moments',
      title: 'Nice Moments',
      value: nicePoints,
      cleanText: `You had ${nicePoints.toLocaleString()} nice moments.`,
      funnyText: randomItem([
        `You created ${nicePoints.toLocaleString()} moments of joy 🎁\nSanta is proud!`,
        `${nicePoints.toLocaleString()} nice moments!\nPure holiday spirit 🎄`,
        `Certified giver energy!\n${nicePoints.toLocaleString()} good deeds ⭐`,
        `Warm cocoa energy detected.\n${nicePoints.toLocaleString()} wholesome moments ☕`,
      ]),
      alternates: [],
      emoji: '🎁',
      color: 'green',
    },
  ], [stats, naughtyPoints, nicePoints]);

  return { slides, judgment, naughtyPoints, nicePoints };
};
