import { useEffect, useState } from 'react';
import type { CSSProperties } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Mail, MapPin, Shield, CheckCircle, Edit, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import defaultContactContent from "@/config/contactContent.json";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

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
    .email("Please enter a valid email address"),
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
  subject: z.string().min(1, 'Please select a subject'),
  priority: z.enum(['low', 'medium', 'high']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  contactMethod: z.enum(['email', 'phone']),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [contactContent, setContactContent] = useState(() => ({
    ...defaultContactContent,
  }));
  const { toast } = useToast();

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
      priority: 'medium',
      contactMethod: 'email',
    },
  });

  useEffect(() => {
    const loadContent = async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "contact_content")
        .maybeSingle();

      if (error || !data?.value) {
        return;
      }

      try {
        const parsed = JSON.parse(data.value);
        setContactContent({ ...defaultContactContent, ...parsed });
      } catch {
        // Keep defaults on parse error
      }
    };

    void loadContent();
  }, []);

  const handleSave = async () => {
    if (!user || !isAdmin()) {
      return;
    }

    setIsSaving(true);
    const payload = JSON.stringify(contactContent);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        {
          key: "contact_content",
          value: payload,
          description: "Contact page content JSON",
        },
        { onConflict: "key" }
      );

    setIsSaving(false);
    if (!error) {
      setIsEditorOpen(false);
    }
  };

  const updateFaqItem = (index: number, patch: { question?: string; answer?: string }) => {
    setContactContent((prev) => {
      const currentItems = (prev as any).faqItems ?? (defaultContactContent as any).faqItems ?? [];
      const nextItems = currentItems.map((item: any, itemIndex: number) =>
        itemIndex === index ? { ...item, ...patch } : item
      );

      return {
        ...prev,
        faqItems: nextItems,
      };
    });
  };

  const renderFaqAnswer = (answer: string) => {
    const tokens = answer.split(/(\{\{email\}\}|\{\{phone\}\})/g);
    return (
      <>
        {tokens.map((token, index) => {
          if (token === "{{email}}") {
            return (
              <a
                key={`faq-email-${index}`}
                href={`mailto:${contactInfo.email}`}
                className="text-primary hover:text-muted"
              >
                email
              </a>
            );
          }
          if (token === "{{phone}}") {
            return (
              <a
                key={`faq-phone-${index}`}
                href={`tel:${contactInfo.phone}`}
                className="text-primary hover:text-muted"
              >
                phone
              </a>
            );
          }
          return <span key={`faq-text-${index}`}>{token}</span>;
        })}
      </>
    );
  };

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      // Store in database
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
          description: 'Failed to submit contact request. Please try again.',
          variant: 'destructive',
        });
        return;
      }

      // Send email notification via Edge Function
      try {
        const idempotencyKey =
          (globalThis as any)?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const { data: functionData, error: functionError } =
          await supabase.functions.invoke('send-contact-notification', {
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
            headers: {
              "Idempotency-Key": idempotencyKey,
            },
          });

        if (functionError) {
          console.error('Edge function error:', functionError);
          // Don't fail the form submission if email fails
        }
      } catch (functionError) {
        console.error('Edge function call failed:', functionError);
        // Don't fail the form submission if email fails
      }

      setSubmitSuccess(true);
      reset();
      toast({
        title: 'Success',
        description:
          "Your message has been sent successfully. We'll get back to you within 24 hours!",
      });
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo = {
    name:
      (contactContent as any).contactInfoName ??
      (defaultContactContent as any).contactInfoName ??
      "Patrick Oliveri",
    phone:
      (contactContent as any).contactInfoPhone ??
      (defaultContactContent as any).contactInfoPhone ??
      "+1 (772) 321-1897",
    email:
      (contactContent as any).contactInfoEmail ??
      (defaultContactContent as any).contactInfoEmail ??
      "support@peacefulinvestment.com",
    address:
      (contactContent as any).contactInfoAddress ??
      (defaultContactContent as any).contactInfoAddress ??
      "Peaceful Investment Headquarters",
  };

  const subjects = [
    'General Support',
    'Technical Issues',
    'Account Questions',
    'Trading Platform',
    'Payment Issues',
    'Security Concerns',
    'Other',
  ];

  if (submitSuccess) {
    return (
      <div className='min-h-screen pt-16'>
        <div className='mx-auto max-w-4xl px-4 py-16'>
          <Card className='text-center'>
            <CardHeader>
              <div className='mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <CardTitle className='text-2xl'>
                Message Sent Successfully!
              </CardTitle>
              <CardDescription>
                Thank you for contacting us. We'll get back to you within 24
                hours.
              </CardDescription>
            </CardHeader>
            <CardContent className='pt-0 sm:pt-0'>
              <Button onClick={() => setSubmitSuccess(false)} className='mt-0 rounded-[8px] border-0 bg-primary hover:bg-primary/70 focus:ring-2 focus:ring-offset-2 focus:ring-primary text-black hover:text-black shadow-none'>
                Send Another Message
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className='pink-yellow-shadow min-h-screen pt-16'>
      {/* Hero Section */}
      <div className='animate-slide-up bg-black/20 px-4 py-10 text-center md:py-12 lg:py-20'>
        {user && !roleLoading && isAdmin() && (
          <div className="fixed right-6 top-24 z-20">
            <Button
              size="sm"
              className="bg-gradient-pink-to-yellow hover:bg-gradient-yellow-to-pink text-white rounded-[8px] border-0"
              onClick={() => setIsEditorOpen(true)}
            >
              <Edit className="h-4 w-4" /> Edit Contact Page
            </Button>
          </div>
        )}
        <div className='mx-auto max-w-7xl px-4 text-center'>
          <h1 className='mb-4 font-inter text-3xl font-bold uppercase text-white md:text-4xl lg:text-5xl xl:text-6xl'>
            {contactContent.heroTitle} <span className='text-primary'>{contactContent.heroTitleHighlight}</span>
          </h1>
          <p className='mx-auto max-w-2xl font-inter text-lg font-normal text-white md:text-[20px]'>
            {contactContent.heroSubtitle}
          </p>
        </div>
      </div>

      <div className='mx-auto max-w-7xl px-4 py-9 md:py-12 xl:py-16'>
        <div className='grid grid-cols-1 gap-12 lg:grid-cols-2'>
          {/* Contact Form */}
          <div className='bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none'>
            <Card className='block rounded-sm border-0 bg-black shadow-none'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 font-inter font-semibold text-white'>
                  <Mail className='h-5 w-5 text-primary' />
                  {contactContent.formTitle}
                </CardTitle>
                <CardDescription>
                  {contactContent.formDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
                  {/* Name and Email */}
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='fullName'
                        className='text-muted-foreground'
                      >
                        {contactContent.labelFullName}
                      </Label>
                      <Input
                        id='fullName'
                        {...register('fullName')}
                        placeholder='Enter your full name'
                        className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent'
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
                          // Auto-capitalize first letter of each word on blur and ensure consistent casing
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
                        <p className='text-sm text-destructive'>
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email' className='text-muted-foreground'>
                        {contactContent.labelEmail}
                      </Label>
                      <Input
                        id='email'
                        type='email'
                        {...register('email')}
                        placeholder='Enter your email address'
                        className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent'
                      />
                      {errors.email && (
                        <p className='text-sm text-destructive'>
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className='space-y-2'>
                    <Label htmlFor='phone' className='text-muted-foreground'>
                      {contactContent.labelPhone}
                    </Label>
                    <Input
                      id='phone'
                      type='tel'
                      {...register('phone')}
                      placeholder='Enter your phone number (e.g., +1234567890)'
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent'
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
                      <p className='text-sm text-destructive'>
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  {/* Subject and Priority */}
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <div className='space-y-2'>
                      <Label
                        htmlFor='subject'
                        className='text-muted-foreground'
                      >
                        {contactContent.labelSubject}
                      </Label>
                      <Select
                        onValueChange={value => setValue('subject', value)}
                      >
                        <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                          <SelectValue placeholder='Select a subject' />
                        </SelectTrigger>
                        <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                          {subjects.map(subject => (
                            <SelectItem key={subject} value={subject}>
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.subject && (
                        <p className='text-sm text-destructive'>
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label
                        htmlFor='priority'
                        className='text-muted-foreground'
                      >
                        {contactContent.labelPriority}
                      </Label>
                      <Select
                        onValueChange={value =>
                          setValue(
                            'priority',
                            value as 'low' | 'medium' | 'high'
                          )
                        }
                      >
                        <SelectTrigger className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                          <SelectValue placeholder='Select priority' />
                        </SelectTrigger>
                        <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                          <SelectItem value='low'>Low</SelectItem>
                          <SelectItem value='medium'>Medium</SelectItem>
                          <SelectItem value='high'>High</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.priority && (
                        <p className='text-sm text-destructive'>
                          {errors.priority.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Message */}
                  <div className='space-y-2'>
                    <Label htmlFor='message' className='text-muted-foreground'>
                      {contactContent.labelMessage}
                    </Label>
                    <Textarea
                      id='message'
                      {...register('message')}
                      placeholder='Describe your issue or question in detail...'
                      rows={6}
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none'
                    />
                    {errors.message && (
                      <p className='text-sm text-destructive capitalize'>
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  {/* Contact Method Preference */}
                  <div className='space-y-2'>
                    <Label className='text-muted-foreground'>
                      {contactContent.labelPreferredContactMethod}
                    </Label>
                    <div className='flex gap-4'>
                      <label className='flex items-center space-x-2'>
                        <input
                          type='radio'
                          value='email'
                          {...register('contactMethod')}
                          className='text-primary'
                        />
                        <span className='text-[15px] font-normal text-white'>
                          Email
                        </span>
                      </label>
                      <label className='flex items-center space-x-2'>
                        <input
                          type='radio'
                          value='phone'
                          {...register('contactMethod')}
                          className='text-primary'
                        />
                        <span className='text-[15px] font-normal text-white'>
                          Phone
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type='submit'
                    className='download-btn-primary w-full font-inter text-sm font-semibold uppercase'
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : contactContent.submitButtonLabel}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className='space-y-6'>
            <Card className='border-0 bg-transparent shadow-none'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 font-inter font-semibold text-white'>
                  <Shield className='h-5 w-5 text-primary' />
                  {contactContent.contactInfoSectionTitle}
                </CardTitle>
                <CardDescription>
                  Get in touch with us through any of these methods.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                    <Mail className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h4 className='text-sm font-normal text-white'>
                      {contactContent.contactInfoEmailLabel}
                    </h4>
                    <p className='font-open-sans text-sm font-normal text-muted-foreground'>
                      <a href={`mailto:${contactInfo.email}`} className='hover:text-primary'>
                      {contactInfo.email}
                      </a> 
                    </p>
                    <p className='font-open-sans text-sm font-normal text-muted-foreground'>
                      {contactContent.contactInfoEmailHelperText}
                    </p>
                  </div>
                </div>

                <Separator className='bg-white/20' />

                <div className='flex items-start gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10'>
                    <MapPin className='h-5 w-5 text-primary' />
                  </div>
                  <div>
                    <h4 className='text-sm font-normal text-white'>
                      {contactContent.contactInfoAddressLabel}
                    </h4>
                    <p className='font-open-sans text-sm font-normal text-muted-foreground'>
                      {contactInfo.address}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ Section */}
            <Card className='glass-card group bg-black p-0 shadow-none'>
              <CardHeader>
                <CardTitle className='mb-0 font-inter text-lg font-normal text-primary'>
                  {contactContent.faqSectionTitle}
                </CardTitle>
                <CardDescription className='mt-0 pt-0'>
                  Quick answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                {(((contactContent as any).faqItems ?? (defaultContactContent as any).faqItems ?? []) as any[]).map(
                  (item, index, array) => (
                    <div key={`faq-item-${index}`} className="space-y-4">
                      <div>
                        <h4 className='mb-1 font-semibold text-white'>
                          {item?.question ?? ""}
                        </h4>
                        <p className='text-sm text-muted-foreground'>
                          {renderFaqAnswer(item?.answer ?? "")}
                        </p>
                      </div>
                      {index < array.length - 1 && <Separator className='bg-white/20' />}
                    </div>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />

      {user && !roleLoading && isAdmin() && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-black/70 transition-opacity ${
              isEditorOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setIsEditorOpen(false)}
            aria-hidden="true"
          />
          <aside
            className={`fixed right-0 top-0 z-50 h-full w-full max-w-md transform bg-[#2e2e2e] text-black shadow-2xl transition-transform duration-300 ${
              isEditorOpen ? "translate-x-0" : "translate-x-full"
            }`}
            aria-label="Edit Contact Page"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Edit Contact Page</h2>
              <Button
                size="sm"
                variant="outline"
                className="text-black border-0 rounded-[8px] bg-white/10 hover:bg-white/20"
                onClick={() => setIsEditorOpen(false)}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
            <div
              className="space-y-4 px-6 pt-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent"
              style={{ height: "calc(100vh - 157px)" }}
            >
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Title</Label>
                <Input
                  value={contactContent.heroTitle}
                  onChange={(event) =>
                    setContactContent((prev) => ({
                      ...prev,
                      heroTitle: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Title Highlight</Label>
                <Input
                  value={(contactContent as any).heroTitleHighlight ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      heroTitleHighlight: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Hero Subtitle</Label>
                <Textarea
                  value={contactContent.heroSubtitle}
                  onChange={(event) =>
                    setContactContent((prev) => ({
                      ...prev,
                      heroSubtitle: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={4}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Form Title</Label>
                <Input
                  value={(contactContent as any).formTitle ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      formTitle: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Form Description</Label>
                <Textarea
                  value={(contactContent as any).formDescription ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      formDescription: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                  rows={3}
                />
              </div>

              <div>
                <Label className="text-sm text-white font-normal">Field Labels</Label>
                <div className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full">
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Full Name</Label>
                    <Input
                      value={(contactContent as any).labelFullName ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelFullName: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Email Address</Label>
                    <Input
                      value={(contactContent as any).labelEmail ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelEmail: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Phone Number</Label>
                    <Input
                      value={(contactContent as any).labelPhone ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelPhone: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Subject</Label>
                    <Input
                      value={(contactContent as any).labelSubject ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelSubject: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Priority Level</Label>
                    <Input
                      value={(contactContent as any).labelPriority ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelPriority: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Message</Label>
                    <Input
                      value={(contactContent as any).labelMessage ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelMessage: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-white font-normal">Preferred Contact Method</Label>
                    <Input
                      value={(contactContent as any).labelPreferredContactMethod ?? ""}
                      onChange={(event) =>
                        setContactContent((prev: any) => ({
                          ...prev,
                          labelPreferredContactMethod: event.target.value,
                        }))
                      }
                      className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Submit Button Label</Label>
                <Input
                  value={(contactContent as any).submitButtonLabel ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      submitButtonLabel: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Contact Info Section Title</Label>
                <Input
                  value={(contactContent as any).contactInfoSectionTitle ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoSectionTitle: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Contact Name</Label>
                <Input
                  value={(contactContent as any).contactInfoName ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoName: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Contact Phone</Label>
                <Input
                  value={(contactContent as any).contactInfoPhone ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoPhone: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Contact Email</Label>
                <Input
                  value={(contactContent as any).contactInfoEmail ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoEmail: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Contact Address</Label>
                <Input
                  value={(contactContent as any).contactInfoAddress ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoAddress: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Email Label</Label>
                <Input
                  value={(contactContent as any).contactInfoEmailLabel ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoEmailLabel: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Email Helper Text</Label>
                <Input
                  value={(contactContent as any).contactInfoEmailHelperText ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoEmailHelperText: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">Address Label</Label>
                <Input
                  value={(contactContent as any).contactInfoAddressLabel ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      contactInfoAddressLabel: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-white font-normal">FAQ Section Title</Label>
                <Input
                  value={(contactContent as any).faqSectionTitle ?? ""}
                  onChange={(event) =>
                    setContactContent((prev: any) => ({
                      ...prev,
                      faqSectionTitle: event.target.value,
                    }))
                  }
                  className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                />
              </div>
              <div>
                <Label className="text-sm text-white font-normal">FAQ Items</Label>
                {(((contactContent as any).faqItems ?? (defaultContactContent as any).faqItems ?? []) as any[]).map(
                  (item, index) => (
                    <div
                      key={`faq-edit-${index}`}
                      className="rounded-lg border border-white/10 p-4 space-y-3 bg-black/20 my-2 inline-block w-full"
                    >
                      <div className="space-y-1">
                        <Label className="text-sm text-white font-normal">Question</Label>
                        <Input
                          value={item?.question ?? ""}
                          onChange={(event) =>
                            updateFaqItem(index, { question: event.target.value })
                          }
                          className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm text-white font-normal">Answer</Label>
                        <Textarea
                          value={item?.answer ?? ""}
                          onChange={(event) =>
                            updateFaqItem(index, { answer: event.target.value })
                          }
                          className="text-black rounded-[8px] shadow-none mt-1 border-0 box-shadow-none resize-none"
                          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as CSSProperties}
                          rows={3}
                        />
                        <p className="text-xs text-white/70">
                          Tip: use <span className="font-mono">{`{{email}}`}</span> and{" "}
                          <span className="font-mono">{`{{phone}}`}</span> to insert clickable links.
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="p-6">
              <Button
                className="w-full bg-gradient-pink-to-yellow text-white rounded-[8px] border-0"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </aside>
        </>
      )}
    </div>
  );
};

export default Contact;
