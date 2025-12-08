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

const contactFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
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
      // Send confirmation email to user
      const userEmailResult = await sendEmail({
        type: EmailType.CONTACT_FORM,
        recipient: {
          email: data.email,
          name: data.fullName,
        },
        variables: {
          name: data.fullName,
          message: data.message,
        },
      });

      // Send notification email to admin
      const adminEmailResult = await sendEmail({
        type: EmailType.SUPPORT_REQUEST,
        recipient: {
          email: 'admin@peacefulinvestment.com',
          name: 'Admin Team',
        },
        variables: {
          userName: data.fullName,
          ticketId: `CONTACT-${Date.now()}`,
          subject: data.subject,
          message: `New contact form submission:\n\nName: ${data.fullName}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not provided'}\nSubject: ${data.subject}\nPriority: ${data.priority}\nContact Method: ${data.contactMethod}\n\nMessage:\n${data.message}`,
          priority: data.priority.toUpperCase(),
        },
      });

      if (userEmailResult.success && adminEmailResult.success) {
        setSubmitSuccess(true);
        reset();
        
        toast({
          title: "Success!",
          description: "Your message has been sent successfully. We'll get back to you soon!",
        });

        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage = userEmailResult.error || adminEmailResult.error || 'Failed to send email';
        toast({
          title: "Error",
          description: `Failed to send email: ${errorMessage}`,
          variant: "destructive",
        });
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
              {...register("phone")}
              placeholder="Enter your phone number"
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
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

