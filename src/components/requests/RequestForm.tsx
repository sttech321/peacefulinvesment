import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useRequests } from "@/hooks/useRequests";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, CreditCard } from "lucide-react";

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

  const depositMethods = [
    'Bank Transfer',
    'Credit Card',
    'Debit Card',
    'Wire Transfer',
    'Cryptocurrency',
  ];

  const withdrawalMethods = [
    'Bank Transfer',
    'Wire Transfer',
    'Cryptocurrency',
    'Check',
  ];

  const paymentMethods = requestType === 'deposit' ? depositMethods : withdrawalMethods;

  const onSubmit = async (data: RequestFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createRequest(data as {
        type: 'deposit' | 'withdrawal';
        amount: number;
        currency: string;
        payment_method: string;
        description?: string;
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
        form.reset();
        onSuccess?.();
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
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select request type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
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
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="BTC">BTC</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional information about your request..."
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