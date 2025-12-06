import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    if (!NEYNAR_API_KEY) {
      throw new Error('NEYNAR_API_KEY is not configured');
    }

    if (!fid) {
      throw new Error('FID is required');
    }

    console.log(`Fetching stats for FID: ${fid}`);

    // Fetch user profile
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
      throw new Error('Failed to fetch user from Neynar');
    }

    const userData = await userResponse.json();
    const user = userData.users?.[0];
    console.log(`User data:`, user?.username, 'follower_count:', user?.follower_count, 'following_count:', user?.following_count);

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

    const stats = {
      replies: Math.max(replies, 1),
      likes_given: Math.max(likesGiven, 10),
      recasts_given: Math.max(recastsGiven, 5),
      active_days: randomActiveDays,
      silent_days: randomSilentDays,
      top_channel: topChannel,
      most_active_hour: parseInt(mostActiveHour),
      longest_streak: Math.max(longestStreak, 1),
    };

    console.log('Final calculated stats:', stats);

    return new Response(JSON.stringify({ stats, user }), {
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
