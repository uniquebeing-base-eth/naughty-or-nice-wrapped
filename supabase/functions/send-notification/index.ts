import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// NOTE: This function should be called with a secret key for security
// But we're allowing public access for now to send the notification

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
    const neynarApiKey = Deno.env.get('NEYNAR_API_KEY');
    
    if (!neynarApiKey) {
      throw new Error('NEYNAR_API_KEY not configured');
    }

    const { title, body, target_url, target_fids } = await req.json();

    // Default notification content
    const notificationTitle = title || "🎄 Oopsie! Share Feature Fixed!";
    const notificationBody = body || "We fixed the share image feature! Come back and share your Naughty or Nice verdict with your friends! 🎅✨";
    const notificationUrl = target_url || "https://naughty-or-nice-wrapped.vercel.app";

    console.log('Sending notification to users...');
    console.log('Title:', notificationTitle);
    console.log('Body:', notificationBody);
    console.log('Target FIDs:', target_fids || 'all opted-in users');

    // Send notification via Neynar API
    // Empty target_fids array = send to all users who have enabled notifications
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/notifications/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': neynarApiKey,
      },
      body: JSON.stringify({
        notification: {
          title: notificationTitle,
          body: notificationBody,
          target_url: notificationUrl,
        },
        target_fids: target_fids || [], // Empty array sends to all opted-in users
      }),
    });

    const responseText = await response.text();
    console.log('Neynar API response status:', response.status);
    console.log('Neynar API response:', responseText);

    if (!response.ok) {
      throw new Error(`Neynar API error: ${responseText}`);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Notification sent successfully',
      result 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending notification:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
