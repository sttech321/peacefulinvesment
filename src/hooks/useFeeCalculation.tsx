import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeeCalculation {
  fee_amount: number;
  net_amount: number;
  fee_breakdown: {
    type: string;
    rate?: number;
    base_fee?: number;
    base_amount?: number;
    calculation?: string;
    minimum_applied?: number;
    maximum_applied?: number;
  };
}

interface FeeStructure {
  id: string;
  request_type: 'deposit' | 'withdrawal';
  payment_method: string;
  currency: string;
  fee_type: 'fixed' | 'percentage' | 'tiered';
  fee_value: number;
  minimum_fee?: number;
  maximum_fee?: number;
  is_active: boolean;
}

function useFeeCalculation() {
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeeStructures();
  }, []);

  const fetchFeeStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('is_active', true)
        .order('request_type', { ascending: true });

      if (error) throw error;
      setFeeStructures((data || []) as FeeStructure[]);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFee = async (
    requestType: 'deposit' | 'withdrawal',
    paymentMethod: string,
    amount: number,
    currency: string = 'USD'
  ): Promise<FeeCalculation | null> => {
    try {
      const { data, error } = await supabase.rpc('calculate_request_fee', {
        p_request_type: requestType,
        p_payment_method: paymentMethod,
        p_amount: amount,
        p_currency: currency,
      });

      if (error) throw error;
      
      return data && data.length > 0 ? {
        fee_amount: data[0].fee_amount,
        net_amount: data[0].net_amount,
        fee_breakdown: data[0].fee_breakdown as any,
      } : null;
    } catch (error) {
      console.error('Error calculating fee:', error);
      return null;
    }
  };

  const getFeeStructureForMethod = (
    requestType: 'deposit' | 'withdrawal',
    paymentMethod: string,
    currency: string = 'USD'
  ): FeeStructure | undefined => {
    return feeStructures.find(
      fee => 
        fee.request_type === requestType &&
        fee.payment_method === paymentMethod &&
        fee.currency === currency
    );
  };

  const getEstimatedFee = (
    requestType: 'deposit' | 'withdrawal',
    paymentMethod: string,
    amount: number,
    currency: string = 'USD'
  ): number => {
    const feeStructure = getFeeStructureForMethod(requestType, paymentMethod, currency);
    if (!feeStructure) return 0;

    let fee = 0;
    if (feeStructure.fee_type === 'fixed') {
      fee = feeStructure.fee_value;
    } else if (feeStructure.fee_type === 'percentage') {
      fee = (amount * feeStructure.fee_value) / 100;
    }

    // Apply minimum and maximum
    if (feeStructure.minimum_fee && fee < feeStructure.minimum_fee) {
      fee = feeStructure.minimum_fee;
    }
    if (feeStructure.maximum_fee && fee > feeStructure.maximum_fee) {
      fee = feeStructure.maximum_fee;
    }

    return fee;
  };

  return {
    feeStructures,
    loading,
    calculateFee,
    getFeeStructureForMethod,
    getEstimatedFee,
    refetchFeeStructures: fetchFeeStructures,
  };
}

export { useFeeCalculation };