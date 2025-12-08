import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fid } = await req.json();
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is not configured');
    }

    if (!fid) {
      throw new Error('FID is required');
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log(`Fetching stats for FID: ${fid}`);

    // Check if we already have saved stats for this FID
    const { data: existingData, error: fetchError } = await supabase
      .from('wrapped_stats')
      .select('*')
      .eq('fid', fid)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing stats:', fetchError);
    }

    if (existingData) {
      console.log(`Found existing stats for FID ${fid}, returning saved data`);
      return new Response(JSON.stringify({ 
        stats: existingData.stats, 
        user: existingData.user_data 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`No existing stats for FID ${fid}, generating new data`);

    // Fetch user profile - with fallback if API fails
    let user: any = null;
    let neynarFailed = false;
    
    try {
      const userResponse = await fetch(
        `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
        {
          headers: {
            'accept': 'application/json',
            'x-api-key': NEYNAR_API_KEY,
          },
        }
      );

      if (!userResponse.ok) {
        console.error('Neynar user API error:', await userResponse.text());
        neynarFailed = true;
      } else {
        const userData = await userResponse.json();
        user = userData.users?.[0];
        console.log(`User data:`, user?.username, 'follower_count:', user?.follower_count, 'following_count:', user?.following_count);
      }
    } catch (e) {
      console.error('Neynar API failed:', e);
      neynarFailed = true;
    }
    
    // If Neynar failed, generate completely random fallback data
    if (neynarFailed || !user) {
      console.log('Generating random fallback data for FID:', fid);
      
      // FIDs with 6 digits or fewer always get Nice (OG users)
      const fidDigits = String(fid).length;
      const isOgUser = fidDigits <= 6;
      
      // FIRST decide if user is Naughty or Nice (OG users always Nice, others 70% Nice, 30% Naughty)
      const isNice = isOgUser ? true : Math.random() < 0.7;
      
      // Generate score based on verdict (Nice: 55-95, Naughty: 20-54)
      const score = isNice 
        ? 55 + Math.floor(Math.random() * 41)
        : 20 + Math.floor(Math.random() * 35);
      
      // Generate naughty/nice points that MATCH the verdict
      let naughtyPoints: number;
      let nicePoints: number;
      
      if (isNice) {
        nicePoints = 8000 + Math.floor(Math.random() * 17000);
        naughtyPoints = 100 + Math.floor(Math.random() * 400);
      } else {
        naughtyPoints = 800 + Math.floor(Math.random() * 1200);
        nicePoints = 1000 + Math.floor(Math.random() * 4000);
      }
      
      const niceBadges = ['Snowflake Saint', 'Gift Giver', 'Holiday Hero', 'Jolly Elf'];
      const naughtyBadges = ['North Pole Rebel', 'Gingerbread Menace', 'Elf Disturber', 'Silent Night Sinner'];
      const badges = isNice ? niceBadges : naughtyBadges;
      const badge = badges[Math.floor(Math.random() * badges.length)];
      
      const fallbackStats = {
        replies: 1500 + Math.floor(Math.random() * 3000),
        likes_given: 5000 + Math.floor(Math.random() * 15000),
        recasts_given: 1000 + Math.floor(Math.random() * 5000),
        likes_received: 10000 + Math.floor(Math.random() * 30000),
        active_days: 100 + Math.floor(Math.random() * 200),
        silent_days: 10 + Math.floor(Math.random() * 80),
        top_channel: 'farcaster',
        most_active_hour: Math.floor(Math.random() * 24),
        longest_streak: 3 + Math.floor(Math.random() * 30),
        judgment: {
          score,
          isNice,
          badge,
          nicePoints,
          naughtyPoints,
        }
      };
      
      const fallbackUser = {
        fid: fid,
        username: `user${fid}`,
        display_name: `Farcaster User`,
        pfp_url: null,
      };
      
      // Save fallback stats to database
      const { error: insertError } = await supabase
        .from('wrapped_stats')
        .insert({
          fid: fid,
          stats: fallbackStats,
          user_data: fallbackUser,
        });
      
      if (insertError) {
        console.error('Error saving fallback stats:', insertError);
      } else {
        console.log(`Saved fallback stats for FID ${fid}`);
      }
      
      return new Response(JSON.stringify({ 
        stats: fallbackStats, 
        user: fallbackUser 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch user's casts with pagination to get more data
    let allCasts: any[] = [];
    let cursor: string | null = null;
    let fetchCount = 0;
    const maxFetches = 5; // Fetch up to 5 pages (750 casts max)

    while (fetchCount < maxFetches) {
      const castsUrl: string = cursor 
        ? `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150&cursor=${cursor}`
        : `https://api.neynar.com/v2/farcaster/feed/user/casts?fid=${fid}&limit=150`;
      
      console.log(`Fetching casts page ${fetchCount + 1}...`);
      
      const castsResponse: Response = await fetch(castsUrl, {
        headers: {
          'accept': 'application/json',
          'x-api-key': NEYNAR_API_KEY,
        },
      });

      if (!castsResponse.ok) {
        console.error('Neynar casts API error:', await castsResponse.text());
        break;
      }

      const castsData: any = await castsResponse.json();
      const casts = castsData.casts || [];
      console.log(`Page ${fetchCount + 1}: Got ${casts.length} casts`);
      
      if (casts.length === 0) break;
      
      allCasts = [...allCasts, ...casts];
      cursor = castsData.next?.cursor;
      fetchCount++;
      
      if (!cursor) break;
    }

    console.log(`Total casts fetched: ${allCasts.length}`);

    // Filter for 2025 casts
    const year2025Start = new Date('2025-01-01T00:00:00Z').getTime();
    const year2025Casts = allCasts.filter((cast: any) => {
      const castDate = new Date(cast.timestamp).getTime();
      return castDate >= year2025Start;
    });

    console.log(`Casts in 2025: ${year2025Casts.length}`);

    // Count replies (casts with parent_hash are replies)
    const replies = year2025Casts.filter((cast: any) => cast.parent_hash).length;
    console.log(`Replies in 2025: ${replies}`);

    // Get unique active days in 2025
    const activeDaysSet = new Set(
      year2025Casts.map((cast: any) => 
        new Date(cast.timestamp).toISOString().split('T')[0]
      )
    );
    const activeDays = activeDaysSet.size;
    console.log(`Active days in 2025: ${activeDays}`);

    // Calculate total likes and recasts given by summing up reactions on user's casts
    // This gives us engagement metrics
    let totalLikesReceived = 0;
    let totalRecastsReceived = 0;
    
    year2025Casts.forEach((cast: any) => {
      totalLikesReceived += cast.reactions?.likes_count || 0;
      totalRecastsReceived += cast.reactions?.recasts_count || 0;
    });

    console.log(`Likes received in 2025: ${totalLikesReceived}`);
    console.log(`Recasts received in 2025: ${totalRecastsReceived}`);

    // Estimate likes/recasts given based on user's engagement patterns
    // Active users typically give more reactions than they receive
    const engagementRatio = user?.following_count ? Math.min(user.following_count / 100, 3) : 1;
    const likesGiven = Math.floor(totalLikesReceived * engagementRatio * 1.5) + (year2025Casts.length * 2);
    const recastsGiven = Math.floor(totalRecastsReceived * engagementRatio) + Math.floor(year2025Casts.length * 0.3);

    console.log(`Estimated likes given: ${likesGiven}`);
    console.log(`Estimated recasts given: ${recastsGiven}`);

    // Calculate days passed in 2025
    const now = new Date();
    const startOf2025 = new Date('2025-01-01T00:00:00Z');
    const daysPassed = Math.floor((now.getTime() - startOf2025.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const silentDays = Math.max(0, daysPassed - activeDays);

    console.log(`Days passed in 2025: ${daysPassed}, Silent days: ${silentDays}`);

    // Calculate most active hour
    const hourCounts: Record<number, number> = {};
    year2025Casts.forEach((cast: any) => {
      const hour = new Date(cast.timestamp).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const mostActiveHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '12';

    // Calculate longest streak
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
    longestStreak = Math.max(longestStreak, currentStreak, 1);

    console.log(`Longest streak: ${longestStreak} days`);

    // Find top channel
    const channelCounts: Record<string, number> = {};
    year2025Casts.forEach((cast: any) => {
      const channel = cast.root_parent_url || cast.parent_url || 'home';
      // Extract channel name from URL
      const channelMatch = channel.match(/\/channel\/([^/]+)/);
      const channelName = channelMatch ? channelMatch[1] : 'home';
      channelCounts[channelName] = (channelCounts[channelName] || 0) + 1;
    });
    const topChannel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'farcaster';

    console.log(`Top channel: ${topChannel}`);

    // Only adjust active/silent days for presentation
    // Active days: 100-340, Silent days: 0-99
    const randomActiveDays = Math.max(100, Math.min(340, activeDays + Math.floor(Math.random() * 150) + 50));
    const randomSilentDays = Math.max(0, Math.min(99, Math.floor(Math.random() * 80) + 10));

    // Apply minimum thresholds for stats WITH MUCH MORE VARIANCE
    // Use wider random ranges so each user gets truly different numbers
    const finalReplies = Math.max(replies, 1500 + Math.floor(Math.random() * 3000)); // 1500-4500
    const finalLikesGiven = Math.max(likesGiven, 5000 + Math.floor(Math.random() * 15000)); // 5000-20000
    const finalRecastsGiven = Math.max(recastsGiven, 1000 + Math.floor(Math.random() * 5000)); // 1000-6000
    const finalLikesReceived = Math.max(totalLikesReceived, 10000 + Math.floor(Math.random() * 30000)); // 10000-40000

    const stats = {
      replies: finalReplies,
      likes_given: finalLikesGiven,
      recasts_given: finalRecastsGiven,
      likes_received: finalLikesReceived,
      active_days: randomActiveDays,
      silent_days: randomSilentDays,
      top_channel: topChannel,
      most_active_hour: parseInt(mostActiveHour),
      longest_streak: Math.max(longestStreak, 1),
    };

    // FIDs with 6 digits or fewer always get Nice (OG users)
    const fidDigits = String(fid).length;
    const isOgUser = fidDigits <= 6;
    
    // FIRST decide if user is Naughty or Nice (OG users always Nice, others 70% Nice, 30% Naughty)
    const isNice = isOgUser ? true : Math.random() < 0.7;
    
    // Generate score based on verdict (Nice: 55-95, Naughty: 20-54)
    const score = isNice 
      ? 55 + Math.floor(Math.random() * 41) // 55-95 for Nice
      : 20 + Math.floor(Math.random() * 35); // 20-54 for Naughty
    
    // Generate naughty/nice points that MATCH the verdict
    let naughtyPoints: number;
    let nicePoints: number;
    
    if (isNice) {
      // Nice verdict: high nice points, lower naughty points
      nicePoints = 8000 + Math.floor(Math.random() * 17000); // 8000-25000
      naughtyPoints = 100 + Math.floor(Math.random() * 400); // 100-500
    } else {
      // Naughty verdict: higher naughty points, lower nice points  
      naughtyPoints = 800 + Math.floor(Math.random() * 1200); // 800-2000
      nicePoints = 1000 + Math.floor(Math.random() * 4000); // 1000-5000
    }
    
    const niceBadges = ['Snowflake Saint', 'Gift Giver', 'Holiday Hero', 'Jolly Elf'];
    const naughtyBadges = ['North Pole Rebel', 'Gingerbread Menace', 'Elf Disturber', 'Silent Night Sinner'];
    const badges = isNice ? niceBadges : naughtyBadges;
    const badge = badges[Math.floor(Math.random() * badges.length)];
    
    const judgment = {
      score,
      isNice,
      badge,
      nicePoints,
      naughtyPoints,
    };

    console.log('Final calculated stats:', stats);
    console.log('Judgment calculated:', judgment);

    // Save stats and judgment to database for this FID
    const { error: insertError } = await supabase
      .from('wrapped_stats')
      .insert({
        fid: fid,
        stats: { ...stats, judgment },
        user_data: user,
      });

    if (insertError) {
      console.error('Error saving stats:', insertError);
      // Don't throw - still return the stats even if save fails
    } else {
      console.log(`Saved stats and judgment for FID ${fid} to database`);
    }

    return new Response(JSON.stringify({ stats: { ...stats, judgment }, user }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in fetch-farcaster-stats:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
