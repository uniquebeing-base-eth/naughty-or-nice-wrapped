import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { addresses, fid } = body;
    
    const NEYNAR_API_KEY = Deno.env.get('NEYNAR_API_KEY');
    if (!NEYNAR_API_KEY) {
      console.error('NEYNAR_API_KEY not configured');
      return new Response(
        JSON.stringify({ users: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If FID is provided, fetch user by FID
    if (fid) {
      try {
        console.log(`Fetching user data for FID: ${fid}`);
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
          {
            headers: {
              'accept': 'application/json',
              'x-api-key': NEYNAR_API_KEY,
            },
          }
        );

        if (!response.ok) {
          console.error(`Neynar API error: ${response.status} ${response.statusText}`);
          const errorText = await response.text();
          console.error('Error body:', errorText);
          return new Response(
            JSON.stringify({ users: [], error: `Neynar API error: ${response.status}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const data = await response.json();
        console.log('Neynar response for FID:', JSON.stringify(data));
        
        // Extract users with verified addresses
        const users = (data.users || []).map((user: any) => ({
          fid: user.fid,
          username: user.username,
          display_name: user.display_name,
          pfp_url: user.pfp_url,
          verified_addresses: {
            eth_addresses: user.verified_addresses?.eth_addresses || [],
          },
          custody_address: user.custody_address,
        }));
        
        console.log('Processed users:', JSON.stringify(users));
        
        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.error('Error fetching user by FID:', err);
        return new Response(
          JSON.stringify({ users: [], error: String(err) }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return new Response(
        JSON.stringify({ error: 'addresses array or fid is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Neynar allows up to 350 addresses per request
    const batchSize = 350;
    const userMap: Record<string, { username: string; pfpUrl: string; fid: number }> = {};

    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize);
      const addressesParam = batch.join(',');
      
      try {
        const response = await fetch(
          `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${encodeURIComponent(addressesParam)}`,
          {
            headers: {
              'accept': 'application/json',
              'x-api-key': NEYNAR_API_KEY,
            },
          }
        );

        if (!response.ok) {
          console.error(`Neynar API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        // data is an object where keys are addresses and values are arrays of users
        if (data && typeof data === 'object') {
          for (const [address, users] of Object.entries(data)) {
            if (Array.isArray(users) && users.length > 0) {
              const user = users[0] as any;
              userMap[address.toLowerCase()] = {
                username: user.username,
                pfpUrl: user.pfp_url,
                fid: user.fid,
              };
            }
          }
        }
      } catch (err) {
        console.error('Error fetching batch:', err);
      }
    }

    return new Response(
      JSON.stringify({ users: userMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
