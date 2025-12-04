import { useState } from 'react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Mail, MapPin, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';

const contactFormSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Please select a subject'),
  priority: z.enum(['low', 'medium', 'high']),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  contactMethod: z.enum(['email', 'phone']),
});

type ContactFormData = z.infer<typeof contactFormSchema>;

const Contact = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
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
    name: 'Patrick Oliveri',
    phone: '+1 (772) 321-1897',
    email: 'support@peacefulinvestment.com',
    address: 'Peaceful Investment Headquarters',
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
            <CardContent>
              <Button onClick={() => setSubmitSuccess(false)} className='mt-4'>
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
        <div className='mx-auto max-w-7xl px-4 text-center'>
          <h1 className='mb-4 font-inter text-3xl font-bold uppercase text-white md:text-4xl lg:text-5xl xl:text-6xl'>
            Contact <span className='text-primary'>Us</span>
          </h1>
          <p className='mx-auto max-w-2xl font-inter text-lg font-normal text-white md:text-[20px]'>
            Get in touch with our support team. We're here to help with any
            questions or technical issues you may have.
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
                  <Mail className='h-5 w-5' />
                  Send us a Message
                </CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as
                  possible.
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
                        Full Name *
                      </Label>
                      <Input
                        id='fullName'
                        {...register('fullName')}
                        placeholder='Enter your full name'
                        className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent'
                      />
                      {errors.fullName && (
                        <p className='text-sm text-destructive'>
                          {errors.fullName.message}
                        </p>
                      )}
                    </div>

                    <div className='space-y-2'>
                      <Label htmlFor='email' className='text-muted-foreground'>
                        Email Address *
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
                      Phone Number (Optional)
                    </Label>
                    <Input
                      id='phone'
                      type='tel'
                      {...register('phone')}
                      placeholder='Enter your phone number'
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent'
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
                        Subject *
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
                        Priority Level
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
                      Message *
                    </Label>
                    <Textarea
                      id='message'
                      {...register('message')}
                      placeholder='Describe your issue or question in detail...'
                      rows={6}
                      className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none'
                    />
                    {errors.message && (
                      <p className='text-sm text-destructive'>
                        {errors.message.message}
                      </p>
                    )}
                  </div>

                  {/* Contact Method Preference */}
                  <div className='space-y-2'>
                    <Label className='text-muted-foreground'>
                      Preferred Contact Method
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
                    {isSubmitting ? 'Sending...' : 'Send Message'}
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
                  <Shield className='h-5 w-5' />
                  Contact Information
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
                      Email Support
                    </h4>
                    <p className='font-open-sans text-sm font-normal text-muted-foreground'>
                      {contactInfo.email}
                    </p>
                    <p className='font-open-sans text-sm font-normal text-muted-foreground'>
                      24/7 support available
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
                      Office Address
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
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription className='mt-0 pt-0'>
                  Quick answers to common questions
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <h4 className='mb-1 font-semibold text-white'>
                    How quickly will I receive a response?
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    We typically respond to all inquiries within 24 hours during
                    business days.
                  </p>
                </div>
                <Separator className='bg-white/20' />
                <div>
                  <h4 className='mb-1 font-semibold text-white'>
                    What information should I include?
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    Please include your account details, specific error
                    messages, and steps to reproduce the issue.
                  </p>
                </div>
                <Separator className='bg-white/20' />
                <div>
                  <h4 className='mb-1 font-semibold text-white'>
                    Is there emergency support available?
                  </h4>
                  <p className='text-sm text-muted-foreground'>
                    Yes, for urgent technical issues affecting your trading,
                    call our emergency line.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Contact;
