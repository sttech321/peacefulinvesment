import React, { useState } from "react";
import { useReferrals } from "@/hooks/useReferrals";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Copy, Share2, Mail, DollarSign, Users, TrendingUp, Calendar, ArrowUpRight, Send, BarChart3, Target, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReferralAnalytics from "@/components/referrals/ReferralAnalytics";
import SocialShare from "@/components/referrals/SocialShare";
import Footer from "@/components/Footer";

const Referrals = () => {
  const { user } = useAuth();
  const { referral, payments, signups, loading, generateReferralLink, copyReferralLink, sendInvitation } = useReferrals();
  
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSubject, setInviteSubject] = useState("Invitation to Peaceful Investment");
  const [inviteMessage, setInviteMessage] = useState("Hi! I wanted to share an investment platform I've been using. I thought you might find it interesting. Check it out when you have a moment!");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [messageError, setMessageError] = useState("");



  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center pink-yellow-shadow">
        <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-lg p-[2px]">
          <Card className="w-full max-w-md bg-black text-center">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Please log in to access the referrals dashboard.</CardDescription>
            </CardHeader>
          </Card>
        </div>  
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pink-yellow-shadow">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleGenerateLink = async () => {
    await generateReferralLink();
  };

  // Enhanced email validation function with domain validation
  const isValidEmail = (email: string): boolean => {
    const trimmedEmail = email.trim().toLowerCase();
    
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return false;
    }
    
    // Check for valid domain structure (at least one dot after @)
    const parts = trimmedEmail.split('@');
    if (parts.length !== 2) {
      return false;
    }
    
    const domain = parts[1];
    
    // Reject obviously invalid/test domains (based on bounce patterns)
    const invalidDomains = [
      'sd.sd',
      'gsg.dfgdf',
      'sd.com',
      'test.com',
      'example.com',
      'invalid.com',
      'test.test',
      'com.com',
    ];
    
    if (invalidDomains.includes(domain)) {
      return false;
    }
    
    // Reject very short domains (likely invalid)
    if (domain.length < 5) {
      return false; // Too short (e.g., "a.b" or "sd.sd")
    }
    
    // Check domain structure - must have valid TLD
    const domainParts = domain.split('.');
    if (domainParts.length < 2) {
      return false; // No TLD
    }
    
    const tld = domainParts[domainParts.length - 1].toLowerCase();
    // Only allow the specific TLDs mentioned in QA requirements
    const validTLDs = [
      "com", "org", "net", "edu", "gov", "in", "co", "io", "info", "ai", "xyz"
    ];
    if (!validTLDs.includes(tld)) {
      return false; // TLD not in allowed list
    }
    
    // Reject suspicious patterns (very short subdomains)
    if (domainParts[0].length < 2 && domainParts.length === 2) {
      return false; // Domain part too short (e.g., "a.com")
    }
    
    // Valid domain structure check
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  };

  const handleEmailChange = (value: string) => {
    setInviteEmail(value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const handleSubjectChange = (value: string) => {
    setInviteSubject(value);
    // Clear error when user starts typing
    if (subjectError) {
      setSubjectError("");
    }
  };

  const handleMessageChange = (value: string) => {
    setInviteMessage(value);
    // Clear error when user starts typing
    if (messageError) {
      setMessageError("");
    }
  };

  const handleSendInvite = async () => {
    const trimmedEmail = inviteEmail.trim();
    const trimmedSubject = inviteSubject.trim();
    const trimmedMessage = inviteMessage.trim();
    
    let hasErrors = false;
    const errorMessages: string[] = [];

    // Validate email - required and must be valid format
    if (!trimmedEmail) {
      setEmailError("Please enter an email address");
      errorMessages.push("Email address is required");
      hasErrors = true;
    } else if (!isValidEmail(trimmedEmail)) {
      setEmailError("Please enter a valid email address with a real domain (e.g., user@gmail.com). Invalid or test domains are not allowed.");
      errorMessages.push("Email address format is invalid or domain is not valid");
      hasErrors = true;
    } else {
      setEmailError("");
    }

    // Validate subject - required (check even if it has default value)
    if (!trimmedSubject || trimmedSubject.length === 0) {
      setSubjectError("Please enter a subject");
      errorMessages.push("Subject is required");
      hasErrors = true;
    } else if (trimmedSubject.length < 3) {
      setSubjectError("Subject must be at least 3 characters long");
      errorMessages.push("Subject is too short");
      hasErrors = true;
    } else {
      setSubjectError("");
    }

    // Validate message - required (check even if it has default value)
    if (!trimmedMessage || trimmedMessage.length === 0) {
      setMessageError("Please enter a message");
      errorMessages.push("Message is required");
      hasErrors = true;
    } else if (trimmedMessage.length < 10) {
      setMessageError("Message must be at least 10 characters long");
      errorMessages.push("Message is too short");
      hasErrors = true;
    } else {
      setMessageError("");
    }

    // If there are validation errors, show toast and return
    if (hasErrors) {
      toast({
        title: "Validation Error",
        description: errorMessages.length > 0 
          ? errorMessages.join(". ") 
          : "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    // All validations passed, send invitation
    try {
      await sendInvitation(trimmedEmail, trimmedSubject, trimmedMessage);
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInviteSubject("Invitation to Peaceful Investment");
      setInviteMessage("Hi! I wanted to share an investment platform I've been using. I thought you might find it interesting. Check it out when you have a moment!");
      // Clear all errors
      setEmailError("");
      setSubjectError("");
      setMessageError("");
    } catch (error) {
      // Error handling is done in sendInvitation function
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'deposited': return 'default';
      case 'earning': return 'outline';
      case 'completed': return 'outline';
      default: return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const displayName =
    (user.user_metadata as any)?.full_name ||
    (user.user_metadata as any)?.name ||
    'Your account';

  const ownerInfoBadge = (
    <div className="mt-2 text-xs sm:text-sm text-muted-foreground space-y-0.5">
      <p>
        <span className="font-semibold text-white mr-1">Name:</span>
        <span className="text-white">{displayName}</span>
      </p>
      {user.email && (
        <p className="break-all">
          <span className="font-semibold text-white mr-1">Email:</span>
          <span>{user.email}</span>
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen pink-yellow-shadow pt-24">
      <div className="max-w-7xl mx-auto p-4 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Referrals Dashboard</h1>
          <p className="text-muted-foreground">Earn 5% commission on every successful referral</p>
        </div>

        {/* Generate Referral Link Section */}
        {!referral && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5" />
                Get Started with Referrals
              </CardTitle>
              <CardDescription>
                Generate your unique referral link to start earning commissions.
                {ownerInfoBadge}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  onClick={handleGenerateLink} 
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    "Generate My Referral Link"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {referral && (
          <Tabs defaultValue="overview" className="space-y-6 w-full">
            <div className='bg-gradient-pink-to-yellow mb-5 rounded-lg p-[2px] lg:mb-12'>
              <TabsList className='grid w-full grid-cols-4 bg-black'>
                <TabsTrigger value="overview" className='flex items-center gap-2 text-xs md:text-sm px-2'>Overview</TabsTrigger>
                <TabsTrigger value="analytics" className='flex items-center gap-2 text-xs md:text-sm px-2'>Analytics</TabsTrigger>
                <TabsTrigger value="share" className='flex items-center gap-2 text-xs md:text-sm px-2'>Share</TabsTrigger>
                <TabsTrigger value="history" className='flex items-center gap-2 text-xs md:text-sm px-2'>History</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview" className="space-y-6">
              {/* Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                  <div className="glass-card p-6 mt-0 rounded-sm bg-black ">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-xl font-medium text-white font-inter">Total Referrals</h3>
                      <Users className="h-4 w-4  text-[var(--yellowcolor)]" />
                    </div>
                    <div className="card-content">
                      <div className="text-2xl font-bold text-white">{referral.total_referrals}</div>
                      <p className="text-sm text-muted-foreground font-open-sans text-white">Active signups</p>
                    </div>
                  </div>
                </div>  
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                  <div className="glass-card p-6  mt-0 rounded-sm  bg-black">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-xl font-medium font-inter text-white">Total Earnings</h3>
                      <DollarSign className="h-4 w-4  text-[var(--yellowcolor)]" />
                    </div>
                    <div className="card-content">
                      <div className="text-2xl font-bold text-white">{formatCurrency(referral.total_earnings)}</div>
                      <p className="text-sm text-muted-foreground font-open-sans text-white">Lifetime commissions</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">  
                  <div className="glass-card p-6 h-full mt-0 rounded-sm  bg-black">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-xl font-medium font-inter text-white">YTD Earnings</h3>
                      <TrendingUp className="h-4 w-4  text-[var(--yellowcolor)]" />
                    </div>
                    <div  className="card-content">
                      <div className="text-2xl font-bold text-white">{formatCurrency(referral.year_to_date_earnings)}</div>
                      <p className="text-sm text-muted-foreground font-open-sans text-white">This year so far</p>
                    </div>
                  </div>
                </div>  
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                  <div className="glass-card p-6  mt-0 h-full rounded-sm bg-black">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <h3 className="text-xl font-medium font-inter text-white">Status</h3>
                      <Calendar className="h-4 w-4 text-[var(--yellowcolor)]" />
                    </div>
                    <div className="card-content">
                      <Badge variant={getStatusColor(referral.status)} className="text-sm">
                        {referral.status.charAt(0).toUpperCase() + referral.status.slice(1)}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1 font-open-sans text-white">Current status</p>
                    </div>
                  </div>
                </div>  
              </div>

              {/* Referral Link Sharing */}
              <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                <div className="glass-card p-6 mt-0 rounded-sm bg-black">
                  <div className="mb-3 flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 font-inter text-white">
                      <Share2 className="h-5 w-5" />
                      Your Referral Link
                    </h3>
                    {ownerInfoBadge}
                    <div className="text-muted-foreground">
                      Share this link with friends to earn 5% commission on their deposits.
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        value={referral.referral_link} 
                        readOnly 
                        className="rounded-[8px] shadow-none mt-1 border-0 box-shadow-none"
                        style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                      />
                      <Button onClick={copyReferralLink} variant="outline" size="icon" className="rounded-[8px] shadow-none mt-1 border-0 box-shadow-none">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Dialog 
                        open={isInviteDialogOpen} 
                        onOpenChange={(open) => {
                          setIsInviteDialogOpen(open);
                          if (!open) {
                            // Reset form and errors when dialog closes
                            setInviteEmail("");
                            setEmailError("");
                            setSubjectError("");
                            setMessageError("");
                            setInviteSubject("Invitation to Peaceful Investment");
                            setInviteMessage("Hi! I wanted to share an investment platform I've been using. I thought you might find it interesting. Check it out when you have a moment!");
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2 rounded-[8px]">
                            <Mail className="h-4 w-4" />
                            Send Invitation
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Send Referral Invitation</DialogTitle>
                            <DialogDescription>
                              Send a personalized invitation email to invite someone to join.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="email">
                                Email Address <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="email"
                                type="email"
                                placeholder="Enter email address"
                                required
                                className={`rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none ${
                                  emailError ? "border-red-500 focus-visible:border-red-500" : ""
                                }`}
                                style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                                value={inviteEmail}
                                onChange={(e) => handleEmailChange(e.target.value)}
                              />
                              {emailError && (
                                <p className="text-sm text-red-500 mt-1">{emailError}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="subject">
                                Subject <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id="subject"
                                value={inviteSubject}
                                required
                                className={`rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none ${
                                  subjectError ? "border-red-500 focus-visible:border-red-500" : ""
                                }`}
                                style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                                onChange={(e) => handleSubjectChange(e.target.value)}
                              />
                              {subjectError && (
                                <p className="text-sm text-red-500 mt-1">{subjectError}</p>
                              )}
                            </div>
                            <div>
                              <Label htmlFor="message">
                                Message <span className="text-red-500">*</span>
                              </Label>
                              <Textarea
                                id="message"
                                placeholder="Enter your message"
                                value={inviteMessage}
                                required
                                className={`rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none ${
                                  messageError ? "border-red-500 focus-visible:border-red-500" : ""
                                }`}
                                style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                                onChange={(e) => handleMessageChange(e.target.value)}
                                rows={4}
                              />
                              {messageError && (
                                <p className="text-sm text-red-500 mt-1">{messageError}</p>
                              )}
                            </div>
                            {/* <Button onClick={handleSendInvite} className="w-full ">
                              <Send className="h-4 w-4 mr-2" />
                              Send Invitation
                            </Button> */}
                               
                              <Button  onClick={handleSendInvite} 
                              className="flex items-center gap-2 rounded-[8px]">
                            <Mail className="h-4 w-4" />
                            Send Invitation
                          </Button>
                           
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="bg-muted/20 p-4 rounded-lg">
                      <p className="text-sm text-white">
                        <strong className="text-white">Referral Code:</strong> {referral.referral_code}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Share this code directly if someone prefers to enter it manually during signup.
                      </p>
                    </div>
                  </div>
                </div>
              </div>  

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Signups */}
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                  <div className="glass-card p-6  mt-0 h-full rounded-sm  bg-black">
                    <div>
                      <h3 className="flex items-center gap-2 text-white">
                        <Users className="h-5 w-5 text-[var(--yellowcolor)]" />
                        Recent Signups
                      </h3>
                      <div className="text-sm text-muted-foreground pb-2">
                        People who joined using your referral link
                      </div>
                    </div>
                    <div className="card-content">
                      {signups.length === 0 ? (
                        <p className="text-muted-foreground py-4">
                          No signups yet. Share your referral link to get started!
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {signups.slice(0, 5).map((signup) => (
                            <div key={signup.id} className="flex items-center justify-between p-3 bg-white/20 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-white">New User Signup</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(signup.signup_date)}
                                </p>
                              </div>
                              <div className="text-right">
                                {signup.deposit_amount ? (
                                  <div>
                                    <p className="text-sm font-medium text-green-600">
                                      {formatCurrency(signup.deposit_amount)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Deposited</p>
                                  </div>
                                ) : (
                                  <Badge variant="secondary">Pending</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                          {signups.length > 5 && (
                            <Button variant="link" className="w-full" size="sm">
                              View All Signups <ArrowUpRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Payment History */}
                <div className="bg-gradient-pink-to-yellow hover:glow-primary relative rounded-sm p-[2px]">
                  <div className="glass-card p-6  mt-0 h-full rounded-sm  bg-black">
                    <div>
                      <h3 className="flex items-center gap-2 text-white">
                        <DollarSign className="h-5 w-5 text-[var(--yellowcolor)]" />
                        Commission Payments
                      </h3>
                      <div className="text-muted-foreground">
                        Your commission payment history
                      </div>
                    </div>
                    <div className="card-content">
                      {payments.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          No payments yet. Commissions will appear here once your referrals make deposits.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {payments.slice(0, 5).map((payment) => (
                            <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium">Commission Payment</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(payment.payment_date)}
                                </p>
                                {payment.notes && (
                                  <p className="text-xs text-muted-foreground">{payment.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-medium text-green-600">
                                  +{formatCurrency(payment.amount)}
                                </p>
                              </div>
                            </div>
                          ))}
                          {payments.length > 5 && (
                            <Button variant="link" className="w-full" size="sm">
                              View All Payments <ArrowUpRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>  
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <ReferralAnalytics 
                referral={referral}
                signups={signups}
                payments={payments}
              />
            </TabsContent>

            <TabsContent value="share">
              <SocialShare 
                referralLink={referral.referral_link}
                referralCode={referral.referral_code}
              />
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {/* Detailed Signup History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Signups ({signups.length})
                  </CardTitle>
                  <CardDescription>
                    Complete history of users who joined using your referral
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {signups.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No signups yet. Start sharing your referral link!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {signups.map((signup) => (
                        <div key={signup.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-white">User Signup</p>
                            <p className="text-xs text-muted-foreground">
                              Joined: {formatDate(signup.signup_date)}
                            </p>
                            {signup.deposit_date && (
                              <p className="text-xs text-muted-foreground">
                                Deposited: {formatDate(signup.deposit_date)}
                              </p>
                            )}
                          </div>
                          <div className="text-right space-y-1">
                            {signup.deposit_amount ? (
                              <>
                                <p className="text-sm font-medium text-green-600">
                                  {formatCurrency(signup.deposit_amount)}
                                </p>
                                <Badge variant="default" className="text-xs">
                                  Commission: {formatCurrency(signup.deposit_amount * 0.05)}
                                </Badge>
                              </>
                            ) : (
                              <Badge variant="secondary">Pending Deposit</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Detailed Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    All Payments ({payments.length})
                  </CardTitle>
                  <CardDescription>
                    Complete history of commission payments received
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No payments received yet. Payments will appear once your referrals deposit.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="space-y-1">
                            <p className="text-sm font-medium">Commission Payment</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payment.payment_date)}
                            </p>
                            {payment.notes && (
                              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                {payment.notes}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              +{formatCurrency(payment.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* How It Works */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>How Referrals Work</CardTitle>
            <CardDescription>Earn money by referring new users to our platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Share2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-white">1. Share Your Link</h3>
                <p className="text-sm text-muted-foreground">
                  Share your unique referral link with friends and family
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-white">2. They Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  New users create an account using your referral link
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 mx-auto">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-white">3. Earn 5%</h3>
                <p className="text-sm text-muted-foreground">
                  Get 5% commission when they make their first deposit
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
};

export default Referrals;