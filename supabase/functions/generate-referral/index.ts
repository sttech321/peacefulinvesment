import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReferralRequest {
  user_id: string;
  base_url?: string; // Optional base URL from client
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify the user
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    let requestData: ReferralRequest;
    try {
      requestData = await req.json();
    } catch (parseError) {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { user_id, base_url } = requestData;
    
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify the user_id matches the authenticated user
    if (user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if user already has a referral
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingReferral) {
      return new Response(JSON.stringify({
        success: true,
        referral: existingReferral,
        message: 'Referral link already exists'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Get user's profile for first name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user_id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
    }

    // Extract first name or use fallback
    const fullName = profile?.full_name || user.email?.split('@')[0] || 'USER';
    const firstName = fullName.split(' ')[0];

    // Generate referral code using the database function
    const { data: codeData, error: codeError } = await supabase
      .rpc('generate_referral_code', { first_name: firstName });

    if (codeError) {
      throw codeError;
    }

    const referralCode = codeData;
    
    // Helper function to check if URL is production
    const isProductionUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        return hostname === 'www.peacefulinvestment.com' || 
               hostname === 'peacefulinvestment.com' ||
               hostname.endsWith('.peacefulinvestment.com') && !hostname.includes('ccw8gc8c4w480c8g4so44k4k');
      } catch {
        return false;
      }
    };

    // Helper function to check if URL is dev/staging
    const isDevUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com');
      } catch {
        return false;
      }
    };

    // Get base URL dynamically from multiple sources
    const getBaseUrl = (): string => {
      let detectedProduction = false;
      let detectedDev = false;
      let candidateUrl = '';
      
      // 1. Try base_url from request body (most reliable - comes from client)
      if (base_url) {
        try {
          const url = new URL(base_url);
          const origin = url.origin;
          
          // If it's production, use it immediately and return
          if (isProductionUrl(origin)) {
            console.log('Production URL detected from base_url:', origin);
            return 'https://www.peacefulinvestment.com';
          }
          
          // If it's dev, remember it but don't return yet (check for production first)
          if (isDevUrl(origin)) {
            detectedDev = true;
            candidateUrl = 'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com';
          } else {
            candidateUrl = origin;
          }
        } catch {
          // Invalid URL, continue to next option
        }
      }
      
      // 2. Try environment variable (set in Supabase Edge Functions secrets)
      const envBaseUrl = Deno.env.get('APP_BASE_URL');
      if (envBaseUrl) {
        // Normalize to production if it's a production URL
        if (isProductionUrl(envBaseUrl)) {
          console.log('Production URL detected from APP_BASE_URL:', envBaseUrl);
          return 'https://www.peacefulinvestment.com';
        }
        if (!candidateUrl) {
          candidateUrl = envBaseUrl;
        }
      }
      
      // 3. Try to get from request headers (may not work with Supabase invoke)
      const forwardedHost = req.headers.get('x-forwarded-host');
      const forwardedProto = req.headers.get('x-forwarded-proto') || 'https';
      
      if (forwardedHost) {
        const forwardedUrl = `${forwardedProto}://${forwardedHost}`;
        // Always prefer production over dev - if we detect production anywhere, use it
        if (isProductionUrl(forwardedUrl)) {
          console.log('Production URL detected from x-forwarded-host:', forwardedUrl);
          return 'https://www.peacefulinvestment.com';
        }
        if (isDevUrl(forwardedUrl) && !detectedProduction) {
          detectedDev = true;
          if (!candidateUrl) {
            candidateUrl = 'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com';
          }
        } else if (!candidateUrl) {
          candidateUrl = forwardedUrl;
        }
      }
      
      const origin = req.headers.get('Origin') || req.headers.get('Referer');
      if (origin) {
        try {
          const url = new URL(origin);
          
          // Always prefer production over dev - if we detect production anywhere, use it
          if (isProductionUrl(url.origin)) {
            console.log('Production URL detected from headers:', url.origin);
            return 'https://www.peacefulinvestment.com';
          }
          
          // Check if it's the dev server
          if (isDevUrl(url.origin) && !detectedProduction) {
            detectedDev = true;
            if (!candidateUrl) {
              candidateUrl = 'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com';
            }
          } else if (!candidateUrl) {
            candidateUrl = url.origin;
          }
        } catch {
          // Invalid URL, continue to fallback
        }
      }
      
      // 4. If we have a candidate URL and it's not production, use it
      // But if we're unsure, always default to production for safety
      if (candidateUrl && detectedDev && !detectedProduction) {
        console.log('Using dev URL:', candidateUrl);
        return candidateUrl;
      }
      
      // 5. Always default to production URL (safest option)
      console.log('Defaulting to production URL');
      return 'https://www.peacefulinvestment.com';
    };
    
    const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash if present
    const referralLink = `${baseUrl}/auth?mode=signup&ref=${referralCode}`;

    // Create new referral
    const { data: newReferral, error: createError } = await supabase
      .from('referrals')
      .insert({
        user_id,
        referral_code: referralCode,
        referral_link: referralLink,
        is_active: true,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    console.log('Created new referral:', newReferral);

    return new Response(JSON.stringify({
      success: true,
      referral: newReferral,
      message: 'Referral link generated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in generate-referral function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);