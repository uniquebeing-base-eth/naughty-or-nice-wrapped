import { useMemo } from 'react';
import { UserStats, SlideContent, JudgmentResult } from '@/types/wrapped';

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
        `You sent ${stats.replies.toLocaleString()} replies…\nSome sweet, some chaotic, all unforgettable 😈😂`,
        `${stats.replies.toLocaleString()} replies!\nCertified Farcaster chatterbox.\nYou simply refuse to keep quiet 💬`,
        `${stats.replies.toLocaleString()} replies dropped!\nElf-level typing stamina unlocked 🧝\nYour keyboard needs a vacation!`,
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
        `You gave ${stats.likesGiven.toLocaleString()} likes 🎁\nYour thumb deserves a Christmas bonus.\nSanta approves your kindness!`,
        `${stats.likesGiven.toLocaleString()} likes!\nLove distributor of the North Pole ❄️\nGenerous elf energy detected!`,
        `${stats.likesGiven.toLocaleString()} hearts spread!\nYou're basically a walking gift 🎁\nThe timeline thanks you!`,
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
        `You received ${stats.likesReceived.toLocaleString()} likes ❄️\nYour casts sparkle with Christmas magic.\nYou're basically Farcaster's Rudolph 🦌`,
        `${stats.likesReceived.toLocaleString()} likes received!\nPeople REALLY like your vibe ✨\nSanta is jealous of your engagement!`,
        `${stats.likesReceived.toLocaleString()} hearts earned!\nYou're lowkey famous around here 👀\nThe elves are taking notes!`,
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
        `You recasted ${stats.recastsGiven.toLocaleString()} posts 🎄\nSharing is caring — certified community elf.\nYour recasts keep the sleigh running!`,
        `${stats.recastsGiven.toLocaleString()} recasts!\nNorth Pole signal booster activated 📡\nGift-giver behavior unlocked!`,
        `${stats.recastsGiven.toLocaleString()} posts shared!\nYou're the reason good content spreads 🛷\nThe algorithm loves you!`,
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
        `You posted for ${stats.activeDays} days straight ❄️\nDedication level: Santa-before-Christmas.\nConsistency colder than the North Pole!`,
        `${stats.activeDays} active days!\nElf work ethic unlocked 💪\nThe Farcaster grind never sleeps!`,
        `${stats.activeDays} days of posting!\nYou showed up like rent was due 🔥\nThat's some serious commitment!`,
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
        `You disappeared for ${stats.silentDays} days 😴\nSanta thought you melted.\nElf PTO detected!`,
        `${stats.silentDays} silent days!\nHoliday hibernation mode activated 💤\nGhost of Christmas Past vibes!`,
        `${stats.silentDays} days offline!\nWe filed a missing elf report 👻\nGlad you came back though!`,
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
        `You dropped ${naughtyPoints} spicy replies 😈\nElf Committee is reviewing your case…\nChaos levels rising!`,
        `${naughtyPoints} naughty moments detected!\nNorth Pole incident report filed 📋\nGingerbread crimes committed!`,
        `${naughtyPoints} moments of chaos!\nYou chose violence sometimes 🔥\nThe coal list is being updated…`,
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
        `You created ${nicePoints.toLocaleString()} moments of joy 🎁\nSanta is proud.\nPure holiday spirit energy!`,
        `${nicePoints.toLocaleString()} nice moments!\nCertified giver. Warm cocoa energy ☕\nYou made the timeline better!`,
        `${nicePoints.toLocaleString()} wholesome moments!\nYou spread more joy than Santa himself 🎅\nThe North Pole salutes you!`,
      ]),
      alternates: [],
      emoji: '🎁',
      color: 'green',
    },
  ], [stats, naughtyPoints, nicePoints]);

  return { slides, judgment, naughtyPoints, nicePoints };
};
