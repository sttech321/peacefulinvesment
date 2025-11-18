import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useFeeCalculation } from "@/hooks/useFeeCalculation";
import { Calculator, Info, DollarSign, Percent, TrendingDown, TrendingUp } from "lucide-react";

interface FeeCalculatorProps {
  requestType: 'deposit' | 'withdrawal';
  paymentMethod: string;
  amount: number;
  currency: string;
  onFeeCalculated?: (feeAmount: number, netAmount: number) => void;
}

const FeeCalculator = ({ 
  requestType, 
  paymentMethod, 
  amount, 
  currency,
  onFeeCalculated 
}: FeeCalculatorProps) => {
  const { getFeeStructureForMethod, calculateFee } = useFeeCalculation();
  const [feeCalculation, setFeeCalculation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (amount > 0 && paymentMethod) {
      calculateFees();
    } else {
      setFeeCalculation(null);
      onFeeCalculated?.(0, amount);
    }
  }, [requestType, paymentMethod, amount, currency]);

  const calculateFees = async () => {
    setLoading(true);
    try {
      const calculation = await calculateFee(requestType, paymentMethod, amount, currency);
      setFeeCalculation(calculation);
      
      if (calculation) {
        onFeeCalculated?.(calculation.fee_amount, calculation.net_amount);
      }
    } catch (error) {
      console.error('Error calculating fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const feeStructure = getFeeStructureForMethod(requestType, paymentMethod, currency);

  if (!amount || amount <= 0) {
    return null;
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5" />
          Fee Calculation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : feeCalculation ? (
          <div className="space-y-4">
            {/* Fee Structure Info */}
            {feeStructure && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <p className="font-medium">Fee Structure for {paymentMethod}</p>
                    <div className="text-sm space-y-1">
                      {feeStructure.fee_type === 'fixed' ? (
                        <p>Fixed fee: ${feeStructure.fee_value}</p>
                      ) : (
                        <p>Percentage fee: {feeStructure.fee_value}%</p>
                      )}
                      {feeStructure.minimum_fee && feeStructure.minimum_fee > 0 && (
                        <p>Minimum fee: ${feeStructure.minimum_fee}</p>
                      )}
                      {feeStructure.maximum_fee && (
                        <p>Maximum fee: ${feeStructure.maximum_fee}</p>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Calculation Breakdown */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Request Amount</span>
                  <span className="font-medium">{amount.toLocaleString()} {currency}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    Processing Fee
                  </span>
                  <span className="font-medium text-orange-600">
                    {feeCalculation.fee_amount.toLocaleString()} {currency}
                  </span>
                </div>

                {feeCalculation.fee_breakdown?.type === 'percentage' && (
                  <div className="text-sm text-muted-foreground">
                    <Percent className="h-3 w-3 inline mr-1" />
                    {feeCalculation.fee_breakdown.calculation}
                  </div>
                )}

                {(feeCalculation.fee_breakdown?.minimum_applied || feeCalculation.fee_breakdown?.maximum_applied) && (
                  <div className="text-sm">
                    {feeCalculation.fee_breakdown.minimum_applied && (
                      <Badge variant="outline" className="text-xs">
                        Minimum fee applied: ${feeCalculation.fee_breakdown.minimum_applied}
                      </Badge>
                    )}
                    {feeCalculation.fee_breakdown.maximum_applied && (
                      <Badge variant="outline" className="text-xs">
                        Maximum fee applied: ${feeCalculation.fee_breakdown.maximum_applied}
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {requestType === 'withdrawal' ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    )}
                    <span className="text-sm font-medium text-muted-foreground">
                      {requestType === 'withdrawal' ? 'You Will Receive' : 'Total to Deposit'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">
                    {feeCalculation.net_amount.toLocaleString()} {currency}
                  </div>
                  
                  {requestType === 'withdrawal' && feeCalculation.fee_amount > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Fee deducted: {feeCalculation.fee_amount.toLocaleString()} {currency}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Info for Different Request Types */}
            {requestType === 'withdrawal' && feeCalculation.fee_amount > 0 && (
              <Alert>
                <TrendingDown className="h-4 w-4" />
                <AlertDescription>
                  For withdrawal requests, the processing fee will be deducted from your withdrawal amount. 
                  You will receive {feeCalculation.net_amount.toLocaleString()} {currency} after fees.
                </AlertDescription>
              </Alert>
            )}

            {requestType === 'deposit' && feeCalculation.fee_amount > 0 && (
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  For deposit requests, you may need to pay an additional processing fee of {feeCalculation.fee_amount.toLocaleString()} {currency} 
                  depending on your payment method.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              No fee structure found for {paymentMethod} in {currency}. 
              This request may be processed without additional fees.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default FeeCalculator;