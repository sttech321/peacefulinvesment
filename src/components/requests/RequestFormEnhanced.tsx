import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRequests } from "@/hooks/useRequests";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, CreditCard, Upload } from "lucide-react";
import DocumentUpload from "./DocumentUpload";
import FeeCalculator from "./FeeCalculator";

const requestSchema = z.object({
  type: z.enum(['deposit', 'withdrawal'], { required_error: "Please select a request type" }),
  amount: z.number().min(1, "Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  payment_method: z.string().min(1, "Payment method is required"),
  description: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestSchema>;

interface RequestFormProps {
  onSuccess?: () => void;
}

const RequestForm = ({ onSuccess }: RequestFormProps) => {
  const { createRequest } = useRequests();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [calculatedFee, setCalculatedFee] = useState<number>(0);
  const [netAmount, setNetAmount] = useState<number>(0);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      type: 'deposit',
      currency: 'USD',
      amount: undefined,
      payment_method: '',
      description: '',
    },
  });

  const requestType = form.watch('type');
  const selectedAmount = form.watch('amount');
  const selectedPaymentMethod = form.watch('payment_method');
  const selectedCurrency = form.watch('currency');

  const depositMethods = [
    'Bank Transfer',
    'Credit Card',
    'Debit Card',
    'Wire Transfer',
    'PayPal',
    'Apple Pay',
    'Google Pay',
    'Cryptocurrency (Bitcoin)',
    'Cryptocurrency (Ethereum)',
    'Cryptocurrency (USDC)',
    'ACH Transfer',
    'SEPA Transfer',
  ];

  const withdrawalMethods = [
    'Bank Transfer',
    'Wire Transfer',
    'PayPal',
    'Cryptocurrency (Bitcoin)',
    'Cryptocurrency (Ethereum)',
    'Cryptocurrency (USDC)',
    'Check',
    'ACH Transfer',
    'SEPA Transfer',
  ];

  const paymentMethods = requestType === 'deposit' ? depositMethods : withdrawalMethods;

  const onSubmit = async (data: RequestFormValues) => {
    const submitData = {
      ...data,
      calculated_fee: calculatedFee,
      net_amount: netAmount,
    } as any;
    setIsSubmitting(true);
    try {
      const result = await createRequest(submitData as {
        type: 'deposit' | 'withdrawal';
        amount: number;
        currency: string;
        payment_method: string;
        description?: string;
        calculated_fee?: number;
        net_amount?: number;
      });
      
      if (result.error) {
        toast({
          title: "Error",
          description: "Failed to create request. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: `${requestType === 'deposit' ? 'Deposit' : 'Withdrawal'} request created successfully`,
        });
        setCreatedRequestId(result.data?.id || null);
        setCurrentStep(2);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentsComplete = () => {
    toast({
      title: "Request Complete",
      description: "Your request has been submitted with all documents",
    });
    onSuccess?.();
  };

  const skipDocuments = () => {
    toast({
      title: "Request Submitted",
      description: "Your request has been submitted. You can add documents later if needed.",
    });
    onSuccess?.();
  };

  if (currentStep === 2 && createdRequestId) {
    return (
      <div className="w-full max-w-4xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-blue-600" />
              Upload Supporting Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-6">
              Upload any supporting documents for your {requestType} request. 
              This step is optional but recommended for faster processing.
            </p>
            
            <DocumentUpload 
              requestId={createdRequestId}
              onDocumentsChange={() => {}}
            />
            
            <div className="flex gap-4 mt-6">
              <Button onClick={handleDocumentsComplete} className="flex-1">
                Complete Request
              </Button>
              <Button variant="outline" onClick={skipDocuments} className="flex-1">
                Skip Documents
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {requestType === 'deposit' ? (
            <DollarSign className="h-5 w-5 text-green-600" />
          ) : (
            <CreditCard className="h-5 w-5 text-blue-600" />
          )}
          New {requestType === 'deposit' ? 'Deposit' : 'Withdrawal'} Request
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Request Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent  className='border-secondary-foreground bg-black/90 text-white'>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                        placeholder="0.00"
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />  
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                        <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                        <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                        <SelectItem value="BTC">BTC - Bitcoin</SelectItem>
                        <SelectItem value="ETH">ETH - Ethereum</SelectItem>
                        <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent  className='border-secondary-foreground bg-black/90 text-white'>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            /> */}

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional information about your request..."
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none'
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {requestType === 'deposit' ? 'Deposit' : 'Withdrawal'} Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default RequestForm;