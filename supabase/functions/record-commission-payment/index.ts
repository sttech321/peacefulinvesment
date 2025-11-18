import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CommissionRequest {
  referral_id: string;
  payment_amount: number;
  payment_date?: string;
  notes?: string;
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

    const { referral_id, payment_amount, payment_date, notes }: CommissionRequest = await req.json();

    if (!referral_id || !payment_amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Verify the referral exists
    const { data: referral, error: referralError } = await supabase
      .from('referrals')
      .select('*')
      .eq('id', referral_id)
      .single();

    if (referralError || !referral) {
      return new Response(JSON.stringify({ error: 'Referral not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Record the commission payment
    const { data: payment, error: paymentError } = await supabase
      .from('referral_payments')
      .insert({
        referral_id,
        amount: payment_amount,
        payment_date: payment_date || new Date().toISOString(),
        notes,
      })
      .select()
      .single();

    if (paymentError) {
      throw paymentError;
    }

    console.log('Recorded commission payment:', payment);

    return new Response(JSON.stringify({
      success: true,
      payment,
      message: 'Commission payment recorded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in record-commission-payment function:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

serve(handler);