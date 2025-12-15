import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ReferralRequest {
  user_id: string;
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

    const { user_id }: ReferralRequest = await req.json();

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
    // Use production domain for referral links
    const referralLink = `https://www.peacefulinvestment.com/create-account?ref=${referralCode}`;

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