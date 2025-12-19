import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useEmail, EmailType } from "@/services/email";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const contactFormSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .refine((val) => {
      // Check if value contains only spaces
      return val.trim().length > 0;
    }, "Full name cannot be only spaces")
    .refine((val) => {
      // Check minimum length after trimming spaces
      return val.trim().length >= 2;
    }, "Full name must be at least 2 characters")
    .refine(
      (val) => {
        // Check for special characters (only allow letters, spaces, hyphens, apostrophes)
        const trimmed = val.trim();
        return /^[a-zA-Z\s'-]+$/.test(trimmed);
      },
      "Full name can only contain letters, spaces, hyphens, and apostrophes"
    )
    .transform((val) => {
      // Capitalize first letter of each word
      return val
        .trim()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (val) => {
        const domain = val.split("@")[1];
        if (!domain) return false;
        // Only allow the specific TLDs mentioned in QA requirements
        const validTLDs = [
          "com", "org", "net", "edu", "gov", "in", "co", "io", "info", "ai", "xyz"
        ];
        const tld = domain.split(".").pop()?.toLowerCase();
        return tld && validTLDs.includes(tld);
      },
      "Email must have a valid top-level domain (.com, .org, .net, .edu, .gov, .in, .co, .io, .info, .ai, .xyz, etc.)"
    ),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // Optional field
        // Only allow numeric characters with optional + at the start (country code)
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        // Remove any non-numeric characters except + for validation
        const cleaned = val.replace(/[^\d+]/g, "");
        return phoneRegex.test(cleaned);
      },
      "Phone number must be numeric with a valid country code (e.g., +1234567890)"
    ),
  subject: z.string().min(1, "Please select a subject"),
  priority: z.enum(["low", "medium", "high"]),
  message: z.string().min(10, "Message must be at least 10 characters"),
  contactMethod: z.enum(["email", "phone"]),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormEnhancedProps {
  onSuccess?: () => void;
}

export default function ContactFormEnhanced({ onSuccess }: ContactFormEnhancedProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { toast } = useToast();
  const { sendEmail, isSending, error } = useEmail();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      priority: "medium",
      contactMethod: "email",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    setSubmitSuccess(false);

    try {
      // First, save to database (this must succeed)
      const { error: dbError } = await supabase
        .from('contact_requests')
        .insert([
          {
            full_name: data.fullName,
            email: data.email,
            phone: data.phone || null,
            subject: data.subject,
            priority: data.priority,
            message: data.message,
            contact_method: data.contactMethod,
            status: 'pending',
          },
        ]);

      if (dbError) {
        console.error('Database error:', dbError);
        toast({
          title: 'Error',
          description: dbError.message || 'Failed to submit contact request. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Then send email notification via Edge Function (non-critical)
      try {
        const { error: functionError } = await supabase.functions.invoke('send-contact-notification', {
          body: {
            contactData: {
              full_name: data.fullName,
              email: data.email,
              phone: data.phone || null,
              subject: data.subject,
              priority: data.priority,
              message: data.message,
              contact_method: data.contactMethod,
            },
          },
        });

        if (functionError) {
          console.warn('Email notification failed (non-critical):', functionError);
        }
      } catch (emailError) {
        // Email errors are non-critical - request is already saved
        console.warn('Email notification error (non-critical):', emailError);
      }

      // Success - form submitted and saved
      setSubmitSuccess(true);
      reset();
      
      toast({
        title: "Success!",
        description: "Your message has been sent successfully. We'll get back to you soon!",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Contact form error:", err);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const subjects = [
    "General Inquiry",
    "Account Support",
    "Technical Issue",
    "Investment Questions",
    "Partnership Opportunity",
    "Other",
  ];

  if (submitSuccess) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            Message Sent Successfully!
          </CardTitle>
          <CardDescription>
            Thank you for contacting us. We'll get back to you soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              A confirmation email has been sent to your email address. 
              Our team will review your message and respond within 24 hours.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Send us a Message</CardTitle>
        <CardDescription>
          We'd love to hear from you. Send us a message and we'll respond as soon as possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              {...register("fullName")}
              placeholder="Enter your full name"
              onChange={(e) => {
                let value = e.target.value;
                // Remove special characters - only allow letters, spaces, hyphens, and apostrophes
                const cleaned = value.replace(/[^a-zA-Z\s'-]/g, "");
                
                if (cleaned !== value) {
                  e.target.value = cleaned;
                  value = cleaned;
                }
                
                // Capitalize first letter of each word as user types
                if (value.length > 0) {
                  // Split by spaces and capitalize first letter of each word
                  const words = value.split(' ');
                  const capitalized = words
                    .map((word) => {
                      if (word.length === 0) return word;
                      // Capitalize first letter, keep rest as typed
                      return word.charAt(0).toUpperCase() + word.slice(1);
                    })
                    .join(' ');
                  
                  setValue("fullName", capitalized, { shouldValidate: false });
                } else {
                  setValue("fullName", cleaned, { shouldValidate: false });
                }
              }}
              onBlur={(e) => {
                // Final capitalization on blur to ensure proper formatting
                const value = e.target.value.trim();
                if (value) {
                  const capitalized = value
                    .split(/\s+/)
                    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                    .join(" ");
                  setValue("fullName", capitalized, { shouldValidate: true });
                }
              }}
            />
            {errors.fullName && (
              <p className="text-sm text-red-600">{errors.fullName.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="Enter your email address"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              {...register("phone")}
              placeholder="Enter your phone number (e.g., +1234567890)"
              onChange={(e) => {
                // Only allow numeric characters and + (for country code)
                let value = e.target.value;
                
                // Remove all non-numeric characters except + at the start
                let cleaned = value.replace(/[^\d+]/g, "");
                
                // Ensure + can only appear at the start
                if (cleaned.includes('+')) {
                  const plusIndex = cleaned.indexOf('+');
                  if (plusIndex > 0) {
                    // Remove + if it's not at the start
                    cleaned = cleaned.replace(/\+/g, '');
                  } else if (plusIndex === 0 && cleaned.length > 1 && cleaned[1] === '+') {
                    // Remove duplicate + at the start
                    cleaned = '+' + cleaned.slice(1).replace(/\+/g, '');
                  }
                }
                
                // Update the input value and form state
                if (cleaned !== value) {
                  e.target.value = cleaned;
                  setValue("phone", cleaned, { shouldValidate: true });
                } else {
                  setValue("phone", cleaned, { shouldValidate: true });
                }
              }}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: Country code + number (e.g., +1 234 567 8900)
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Select onValueChange={(value) => setValue("subject", value)}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                {subjects.map((subject) => (
                  <SelectItem key={subject} value={subject}>
                    {subject}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject.message}</p>
            )}
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select onValueChange={(value: "low" | "medium" | "high") => setValue("priority", value)}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {errors.priority && (
              <p className="text-sm text-red-600">{errors.priority.message}</p>
            )}
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              {...register("message")}
              placeholder="Enter your message..."
              rows={5}
            />
            {errors.message && (
              <p className="text-sm text-red-600">{errors.message.message}</p>
            )}
          </div>

          {/* Contact Method */}
          <div className="space-y-2">
            <Label htmlFor="contactMethod">Preferred Contact Method</Label>
            <Select onValueChange={(value: "email" | "phone") => setValue("contactMethod", value)}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Select contact method" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
              </SelectContent>
            </Select>
            {errors.contactMethod && (
              <p className="text-sm text-red-600">{errors.contactMethod.message}</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || isSending}
            className="w-full"
          >
            {isSubmitting || isSending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Message...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Send Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

