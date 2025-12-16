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
  console.log('[EDGE-FUNCTION] generate-referral called');
  console.log('[EDGE-FUNCTION] Request method:', req.method);
  console.log('[EDGE-FUNCTION] Request headers:', {
    origin: req.headers.get('Origin'),
    referer: req.headers.get('Referer'),
    'x-forwarded-host': req.headers.get('x-forwarded-host'),
    'x-forwarded-proto': req.headers.get('x-forwarded-proto')
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('[EDGE-FUNCTION] Handling OPTIONS request');
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.error('[EDGE-FUNCTION] Invalid method:', req.method);
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[EDGE-FUNCTION] No authorization header');
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify the user
    console.log('[EDGE-FUNCTION] Verifying user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('[EDGE-FUNCTION] User verification failed:', userError);
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    console.log('[EDGE-FUNCTION] User verified:', { user_id: user.id, email: user.email });

    let requestData: ReferralRequest;
    try {
      requestData = await req.json();
      console.log('[EDGE-FUNCTION] Request data received:', requestData);
    } catch (parseError) {
      console.error('[EDGE-FUNCTION] Failed to parse request body:', parseError);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { user_id, base_url } = requestData;
    console.log('[EDGE-FUNCTION] Extracted data:', { user_id, base_url });
    
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

    // Helper functions for URL detection (define before use)
    const isProductionUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;
        return hostname === 'www.peacefulinvestment.com' || 
               hostname === 'peacefulinvestment.com' ||
               (hostname.endsWith('.peacefulinvestment.com') && !hostname.includes('ccw8gc8c4w480c8g4so44k4k'));
      } catch {
        return false;
      }
    };

    const isDevUrl = (url: string): boolean => {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.includes('ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com');
      } catch {
        return false;
      }
    };

    // Get base URL function (will be defined later, but we need the helpers first)
    const getBaseUrl = (): string => {
      console.log('[EDGE-FUNCTION] getBaseUrl called');
      
      // 1. Try base_url from request body (most reliable - comes from client)
      if (base_url) {
        console.log('[EDGE-FUNCTION] Checking base_url from request:', base_url);
        try {
          const url = new URL(base_url);
          const origin = url.origin;
          console.log('[EDGE-FUNCTION] Parsed origin:', origin);
          
          // If it's production, use it immediately and return
          if (isProductionUrl(origin)) {
            console.log('[EDGE-FUNCTION] Production URL detected from base_url:', origin);
            return 'https://www.peacefulinvestment.com';
          }
          
          // If it's dev, use dev URL
          if (isDevUrl(origin)) {
            console.log('[EDGE-FUNCTION] Dev URL detected from base_url:', origin);
            return 'https://ccw8gc8c4w480c8g4so44k4k.peacefulinvestment.com';
          }
          
          // For other origins, use the origin directly
          console.log('[EDGE-FUNCTION] Using origin directly:', origin);
          return origin;
        } catch (error) {
          console.error('[EDGE-FUNCTION] Invalid base_url format:', error);
          // Invalid URL, continue to next option
        }
      } else {
        console.log('[EDGE-FUNCTION] No base_url in request body');
      }
      
      // 2. Try environment variable
      const envBaseUrl = Deno.env.get('APP_BASE_URL');
      console.log('[EDGE-FUNCTION] APP_BASE_URL env var:', envBaseUrl || 'not set');
      if (envBaseUrl) {
        if (isProductionUrl(envBaseUrl)) {
          console.log('[EDGE-FUNCTION] Production URL from APP_BASE_URL');
          return 'https://www.peacefulinvestment.com';
        }
        console.log('[EDGE-FUNCTION] Using APP_BASE_URL:', envBaseUrl);
        return envBaseUrl;
      }
      
      // 3. Default to production
      console.log('[EDGE-FUNCTION] Defaulting to production URL');
      return 'https://www.peacefulinvestment.com';
    };

    // Check if user already has a referral
    console.log('[EDGE-FUNCTION] Checking for existing referral for user:', user_id);
    const { data: existingReferral, error: checkError } = await supabase
      .from('referrals')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[EDGE-FUNCTION] Error checking existing referral:', checkError);
      throw checkError;
    }

    if (existingReferral) {
      console.log('[EDGE-FUNCTION] Existing referral found:', {
        id: existingReferral.id,
        referral_code: existingReferral.referral_code,
        referral_link: existingReferral.referral_link
      });
      
      // Check if the referral link needs to be updated
      const correctBaseUrl = getBaseUrl();
      const currentLink = existingReferral.referral_link;
      
      console.log('[EDGE-FUNCTION] Link comparison:', {
        currentLink,
        correctBaseUrl,
        isProduction: isProductionUrl(correctBaseUrl),
        isDev: isDevUrl(correctBaseUrl)
      });
      
      // Extract the referral code from the existing link
      let referralCode = existingReferral.referral_code;
      try {
        const currentUrl = new URL(currentLink);
        const refParam = currentUrl.searchParams.get('ref');
        if (refParam) {
          referralCode = refParam;
          console.log('[EDGE-FUNCTION] Extracted referral code from link:', referralCode);
        }
      } catch (error) {
        console.log('[EDGE-FUNCTION] Could not parse current link, using stored code:', referralCode);
        // If we can't parse, use the existing code
      }
      
      // Build the correct referral link
      const correctReferralLink = `${correctBaseUrl}/auth?mode=signup&ref=${referralCode}`;
      console.log('[EDGE-FUNCTION] Correct referral link should be:', correctReferralLink);
      
      // If the link is wrong, update it
      if (currentLink !== correctReferralLink) {
        console.log('[EDGE-FUNCTION] Link mismatch detected!');
        console.log('[EDGE-FUNCTION] Current:', currentLink);
        console.log('[EDGE-FUNCTION] Correct:', correctReferralLink);
        console.log('[EDGE-FUNCTION] Updating referral link...');
        
        const { data: updatedReferral, error: updateError } = await supabase
          .from('referrals')
          .update({
            referral_link: correctReferralLink,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingReferral.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('[EDGE-FUNCTION] Error updating referral link:', updateError);
          // Still return the existing referral even if update fails
        } else if (updatedReferral) {
          console.log('[EDGE-FUNCTION] Referral link updated successfully:', {
            old: currentLink,
            new: updatedReferral.referral_link
          });
          return new Response(JSON.stringify({
            success: true,
            referral: updatedReferral,
            message: 'Referral link updated successfully'
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
      } else {
        console.log('[EDGE-FUNCTION] Referral link is already correct, no update needed');
      }
      
      console.log('[EDGE-FUNCTION] Returning existing referral');
      return new Response(JSON.stringify({
        success: true,
        referral: existingReferral,
        message: 'Referral link already exists'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } else {
      console.log('[EDGE-FUNCTION] No existing referral found, creating new one');
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
    
    const baseUrl = getBaseUrl().replace(/\/$/, ''); // Remove trailing slash if present
    const referralLink = `${baseUrl}/auth?mode=signup&ref=${referralCode}`;

    console.log('[EDGE-FUNCTION] Creating new referral with:', {
      user_id,
      referral_code: referralCode,
      referral_link: referralLink,
      baseUrl
    });

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
      console.error('[EDGE-FUNCTION] Error creating referral:', createError);
      throw createError;
    }

    console.log('[EDGE-FUNCTION] Created new referral successfully:', {
      id: newReferral.id,
      referral_code: newReferral.referral_code,
      referral_link: newReferral.referral_link
    });

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