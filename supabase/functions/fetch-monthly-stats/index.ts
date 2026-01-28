import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};


// Get current month boundaries
const getCurrentMonthBounds = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, monthName: start.toLocaleString('en-US', { month: 'long' }), year };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fid } = await req.json();
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NEYNAR_API_KEY) throw new Error('NEYNAR_API_KEY is not configured');
    if (!fid) throw new Error('FID is required');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase configuration missing');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { start: monthStart, end: monthEnd, monthName, year } = getCurrentMonthBounds();
    const monthKey = `${year}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;

    console.log(`Fetching monthly stats for FID: ${fid}, Month: ${monthName} ${year}`);

    // Check if we already have saved stats for this month
    const { data: existingStats, error: fetchError } = await supabase
      .from('monthly_wrapped_stats')
      .select('*')
      .eq('fid', fid)
      .eq('month_key', monthKey)
      .maybeSingle();

    if (existingStats && !fetchError) {
      console.log(`Found existing stats for FID ${fid}, month ${monthKey}`);
      return new Response(JSON.stringify({ 
        stats: { ...existingStats.stats, judgment: existingStats.judgment },
        user: existingStats.user_data,
        energy_result: existingStats.energy_result
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user profile
    let user: any = null;
    try {
      const userResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        { headers: { 'accept': 'application/json', 'x-api-key': NEYNAR_API_KEY } }
      );
      if (userResponse.ok) {
        const userData = await userResponse.json();
        user = userData.users?.[0];
        console.log(`User: ${user?.username}`);
      }
    } catch (e) {
      console.error('Neynar user API failed:', e);
    }

    // Fallback user data
    if (!user) {
      user = { fid, username: `user${fid}`, display_name: 'Farcaster User', pfp_url: null };
    }

    // Fetch user's casts with pagination - fetch more to get accurate active days
    let allCasts: any[] = [];
    let cursor: string | null = null;
    let fetchCount = 0;
    const maxFetches = 15; // Increased to get more accurate data for very active users
    let foundOldCasts = false;

    while (fetchCount < maxFetches && !foundOldCasts) {
      const castsUrl: string = cursor
        ? `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150&cursor=${cursor}`
        : `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150`;

      console.log(`Fetching casts page ${fetchCount + 1}...`);
      const castsResponse: Response = await fetch(castsUrl, {
        headers: { 'accept': 'application/json', 'x-api-key': NEYNAR_API_KEY }
      });

      if (!castsResponse.ok) {
        console.error('Neynar casts API error:', await castsResponse.text());
        break;
      }

      const castsData: any = await castsResponse.json();
      const casts = castsData.casts || [];
      console.log(`Page ${fetchCount + 1}: Got ${casts.length} casts`);

      if (casts.length === 0) break;
      
      // Check if we've gone past the start of the month (optimization - stop early)
      const oldestCastDate = casts.length > 0 ? new Date(casts[casts.length - 1].timestamp) : null;
      if (oldestCastDate && oldestCastDate < monthStart) {
        console.log(`Reached casts before ${monthName}, stopping pagination`);
        foundOldCasts = true;
      }
      
      allCasts = [...allCasts, ...casts];
      cursor = castsData.next?.cursor;
      fetchCount++;
      if (!cursor) break;
    }

    console.log(`Total casts fetched: ${allCasts.length} across ${fetchCount} pages`);

    // Filter for current month only
    const monthCasts = allCasts.filter((cast: any) => {
      const castDate = new Date(cast.timestamp);
      return castDate >= monthStart && castDate <= monthEnd;
    });

    console.log(`Casts in ${monthName}: ${monthCasts.length}`);

    // Calculate monthly stats
    const totalCasts = monthCasts.length;
    const replies = monthCasts.filter((cast: any) => cast.parent_hash).length;

    // Engagement metrics
    let totalLikesReceived = 0;
    let totalRecastsReceived = 0;
    let mostRepliedCast: any = null;
    let maxReplies = 0;
    let peakMoment: any = null;
    let peakEngagement = 0;

    // Track users the person engages with (replies to) and who engages with them
    const engagementMap: Map<string, { username: string; fid: number; count: number }> = new Map();

    monthCasts.forEach((cast: any) => {
      const likes = cast.reactions?.likes_count || 0;
      const recasts = cast.reactions?.recasts_count || 0;
      const repliesCount = cast.replies?.count || 0;
      const totalEngagement = likes + recasts + repliesCount;

      totalLikesReceived += likes;
      totalRecastsReceived += recasts;

      // Track parent author (who user is replying to)
      if (cast.parent_author && cast.parent_author.fid && cast.parent_author.username) {
        const parentFid = cast.parent_author.fid;
        const parentUsername = cast.parent_author.username;
        if (parentFid !== fid) { // Don't count self-replies
          const key = String(parentFid);
          const existing = engagementMap.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            engagementMap.set(key, { username: parentUsername, fid: parentFid, count: 1 });
          }
        }
      }

      // Track mentioned users in casts
      if (cast.mentioned_profiles && Array.isArray(cast.mentioned_profiles)) {
        cast.mentioned_profiles.forEach((mentioned: any) => {
          if (mentioned.fid && mentioned.username && mentioned.fid !== fid) {
            const key = String(mentioned.fid);
            const existing = engagementMap.get(key);
            if (existing) {
              existing.count += 2; // Mentions count more
            } else {
              engagementMap.set(key, { username: mentioned.username, fid: mentioned.fid, count: 2 });
            }
          }
        });
      }

      if (repliesCount > maxReplies) {
        maxReplies = repliesCount;
        mostRepliedCast = {
          text: cast.text?.substring(0, 100) || '',
          repliesCount,
          timestamp: cast.timestamp
        };
      }

      if (totalEngagement > peakEngagement) {
        peakEngagement = totalEngagement;
        peakMoment = {
          text: cast.text?.substring(0, 100) || '',
          likes,
          recasts,
          replies: repliesCount,
          timestamp: cast.timestamp
        };
      }
    });

    // Get top 4 engaged users
    const topEngagedUsers = Array.from(engagementMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
      .map(u => ({ username: u.username, fid: u.fid, engagementCount: u.count }));

    console.log('Top engaged users:', topEngagedUsers.map(u => u.username));

    // Active days and streak
    const activeDaysSet = new Set(
      monthCasts.map((cast: any) => new Date(cast.timestamp).toISOString().split('T')[0])
    );
    const activeDays = activeDaysSet.size;

    // Calculate streak
    const sortedDays = Array.from(activeDaysSet).sort();
    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedDays.length; i++) {
      const prevDate = new Date(sortedDays[i - 1]);
      const currDate = new Date(sortedDays[i]);
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak, activeDays > 0 ? 1 : 0);

    // Most active hour
    const hourCounts: Record<number, number> = {};
    monthCasts.forEach((cast: any) => {
      const hour = new Date(cast.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '12';

    // Detect "naughty" moments (spikes, late-night high engagement, gaps)
    const lateNightCasts = monthCasts.filter((cast: any) => {
      const hour = new Date(cast.timestamp).getHours();
      const engagement = (cast.reactions?.likes_count || 0) + (cast.reactions?.recasts_count || 0);
      return (hour >= 23 || hour <= 4) && engagement > 10;
    });

    // Detect gaps (inactive then return with high engagement)
    let hasGapReturn = false;
    if (sortedDays.length > 2) {
      for (let i = 1; i < sortedDays.length; i++) {
        const prevDate = new Date(sortedDays[i - 1]);
        const currDate = new Date(sortedDays[i]);
        const gap = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (gap >= 3) {
          hasGapReturn = true;
          break;
        }
      }
    }

    // Calculate verdict
    // Positive signals: high engagement, consistent posting, supporting others
    // Chaotic signals: spikes, late-night activity, gaps, polarizing content
    const consistencyScore = Math.min(activeDays / 25, 1) * 30;
    const engagementScore = Math.min((totalLikesReceived + totalRecastsReceived) / 500, 1) * 25;
    const repliesScore = Math.min(replies / 50, 1) * 15;
    const streakScore = Math.min(longestStreak / 10, 1) * 15;
    
    let chaoticScore = 0;
    if (lateNightCasts.length > 3) chaoticScore += 15;
    if (hasGapReturn) chaoticScore += 10;
    if (peakEngagement > 100) chaoticScore += 10;

    const niceScore = consistencyScore + engagementScore + repliesScore + streakScore;
    const naughtyScore = chaoticScore;

    // Special handling for OG users
    const fidDigits = String(fid).length;
    const isOgUser = fidDigits <= 6;
    const alwaysNiceFids = [1051182];
    const isSpecialNice = alwaysNiceFids.includes(Number(fid));

    let isNice: boolean;
    let score: number;

    if (isOgUser || isSpecialNice) {
      isNice = true;
      score = 75 + Math.floor(Math.random() * 24);
    } else {
      const totalScore = niceScore - naughtyScore;
      isNice = totalScore >= 40 || Math.random() < 0.65;

      if (isNice) {
        // Map nice confidence: 75-98%
        const confidence = Math.min(Math.max(totalScore / 85, 0.3), 1);
        score = Math.floor(75 + (confidence * 23));
      } else {
        // Map naughty confidence: 20-35%
        const chaosLevel = Math.min(naughtyScore / 35, 1);
        score = Math.floor(20 + (1 - chaosLevel) * 15);
      }
    }

    // Generate points that match verdict
    let nicePoints: number;
    let naughtyPoints: number;

    if (isNice) {
      nicePoints = 3000 + Math.floor(Math.random() * 5000);
      naughtyPoints = 50 + Math.floor(Math.random() * 150);
    } else {
      naughtyPoints = 300 + Math.floor(Math.random() * 500);
      nicePoints = 500 + Math.floor(Math.random() * 1500);
    }

    // Generate flavor titles based on activity
    const flavorTitles: string[] = [];
    if (replies > 100) flavorTitles.push('Conversation Starter');
    if (totalRecastsReceived > 100) flavorTitles.push('Culture Mover');
    if (activeDays >= 20) flavorTitles.push('Community Builder');
    if (lateNightCasts.length > 5) flavorTitles.push('Night Owl');
    if (hasGapReturn) flavorTitles.push('Main Character Moment');
    if (peakEngagement > 200) flavorTitles.push('Viral Energy');
    if (longestStreak >= 7) flavorTitles.push('Consistency King');

    const niceBadges = ['Community Angel', 'Engagement Hero', 'Good Vibes Only', 'Timeline Blessing'];
    const naughtyBadges = ['Timeline Terror', 'Chaos Agent', 'Main Character', 'Unhinged Energy'];
    const badges = isNice ? niceBadges : naughtyBadges;
    const badge = badges[Math.floor(Math.random() * badges.length)];

    // judgment will be defined as cleanJudgment later

    // Helper to sanitize text - remove invalid Unicode surrogate pairs
    const sanitizeText = (text: string | undefined | null, maxLength: number = 500): string => {
      if (!text) return '';
      // Remove lone surrogates that break JSON, also handle other problematic chars
      return String(text)
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '') // Remove lone high surrogates
        .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '') // Remove lone low surrogates
        .replace(/[\uFFFE\uFFFF]/g, '') // Remove BOM and invalid chars
        .replace(/\u0000/g, '') // Remove null chars
        .substring(0, maxLength);
    };

    // Clean complex objects to ensure they serialize properly
    const cleanPeakMoment = peakMoment ? {
      likes: Number(peakMoment.likes) || 0,
      recasts: Number(peakMoment.recasts) || 0,
      replies: Number(peakMoment.replies) || 0,
      text: sanitizeText(peakMoment.text),
      timestamp: peakMoment.timestamp || null,
    } : null;

    const cleanMostRepliedCast = mostRepliedCast ? {
      text: sanitizeText(mostRepliedCast.text),
      replies_count: Number(mostRepliedCast.repliesCount) || 0,
      timestamp: mostRepliedCast.timestamp || null,
    } : null;

    const cleanTopEngagedUsers = topEngagedUsers.map((u: any) => ({
      username: sanitizeText(u.username, 100),
      fid: Number(u.fid || 0),
      count: Number(u.count || 0),
    }));

    const cleanUser = {
      fid: Number(user.fid || fid),
      username: sanitizeText(user.username, 100) || `user${fid}`,
      display_name: sanitizeText(user.display_name, 200) || 'Farcaster User',
      pfp_url: user.pfp_url ? String(user.pfp_url) : null,
    };

    const stats = {
      totalCasts: Number(totalCasts),
      replies: Number(replies),
      likesReceived: Number(totalLikesReceived),
      recastsReceived: Number(totalRecastsReceived),
      activeDays: Number(activeDays),
      longestStreak: Number(longestStreak),
      mostActiveHour: parseInt(mostActiveHour) || 12,
      mostRepliedCast: cleanMostRepliedCast,
      peakMoment: cleanPeakMoment,
      lateNightPosts: Number(lateNightCasts.length),
      hasGapReturn: Boolean(hasGapReturn),
      flavorTitles: flavorTitles.map((t: string) => String(t)),
      month: String(monthName),
      year: Number(year),
      monthKey: String(monthKey),
      topEngagedUsers: cleanTopEngagedUsers,
    };

    const cleanJudgment = {
      score: Number(score),
      isNice: Boolean(isNice),
      badge: String(badge),
      nicePoints: Number(nicePoints),
      naughtyPoints: Number(naughtyPoints),
    };

    console.log('Monthly stats calculated:', { totalCasts, replies, likesReceived: totalLikesReceived, activeDays, score, isNice });

    // Save stats to database
    const dataToSave = {
      fid: Number(fid),
      month_key: String(monthKey),
      stats: stats,
      judgment: cleanJudgment,
      user_data: cleanUser,
    };

    console.log('Saving data for FID:', fid, 'month_key:', monthKey);
    console.log('Data to save structure:', JSON.stringify(dataToSave).substring(0, 500));

    // Try to insert first
    const { data: insertData, error: insertError } = await supabase
      .from('monthly_wrapped_stats')
      .insert([dataToSave])
      .select();

    if (insertError) {
      console.error('Insert error code:', insertError.code, 'message:', insertError.message);
      
      // If insert fails due to conflict, update instead
      if (insertError.code === '23505') { // Unique violation
        console.log('Record exists, updating...');
        const { error: updateError } = await supabase
          .from('monthly_wrapped_stats')
          .update({
            stats: stats,
            judgment: cleanJudgment,
            user_data: cleanUser,
          })
          .eq('fid', Number(fid))
          .eq('month_key', String(monthKey));

        if (updateError) {
          console.error('Failed to update monthly stats:', updateError);
        } else {
          console.log('Monthly stats updated successfully for FID:', fid);
        }
      } else {
        console.error('Failed to insert monthly stats:', insertError);
      }
    } else {
      console.log('Monthly stats saved successfully for FID:', fid, 'insertData:', insertData);
    }

    // Return with cleaned judgment and user
    return new Response(JSON.stringify({ stats: { ...stats, judgment: cleanJudgment }, user: cleanUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch-monthly-stats:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
