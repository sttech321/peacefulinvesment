import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DepositRequest {
  referral_code: string;
  referred_user_id: string;
  deposit_amount: number;
  deposit_date?: string;
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    // Verify the user (admin check would go here)
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // TODO: Add admin role check here
    // For now, allowing all authenticated users for demo purposes

    const { referral_code, referred_user_id, deposit_amount, deposit_date }: DepositRequest = await req.json();

    if (!referral_code || !referred_user_id || !deposit_amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Find the referral by code
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('referral_code', referral_code)
      .single();

    if (referralError || !referral) {
      return new Response(JSON.stringify({ error: 'Referral not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Record the signup and deposit
    const { data: signup, error: signupError } = await supabase
      .from('referral_signups')
      .insert({
        referral_id: referral.id,
        referred_user_id,
        deposit_amount,
        deposit_date: deposit_date || new Date().toISOString(),
      })
      .select()
      .single();

    if (signupError) {
      throw signupError;
    }

    console.log('Recorded referral deposit:', signup);

    return new Response(JSON.stringify({
      success: true,
      signup,
      message: 'Deposit recorded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in record-referral-deposit function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);