import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Settings, Link2, Mail, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LinkItem {
  label: string;
  to: string;
  order?: number;
}

export default function AdminSettings() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  
  // App settings state
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [headerLinks, setHeaderLinks] = useState<LinkItem[]>([]);
  const [footerLinks, setFooterLinks] = useState<LinkItem[]>([]);
  const [depositWithdrawalEmail, setDepositWithdrawalEmail] = useState("");

  // Fetch app settings
  useEffect(() => {
    const checkAndFetch = async () => {
      // Wait for role to load
      if (roleLoading) {
        return;
      }
      
      if (isAdmin()) {
        await fetchAppSettings();
      } else {
        // If not admin, stop loading
        setLoadingSettings(false);
      }
    };
    checkAndFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLoading]);

  const fetchAppSettings = async () => {
    try {
      setLoadingSettings(true);
      
      // Fetch deposit/withdrawal notification email
      let email = import.meta.env.VITE_DEPOSIT_WITHDRAWAL_EMAIL || '';
      
      if (!email) {
        try {
          const { data } = await supabase
            .from('app_settings' as any)
            .select('value')
            .eq('key', 'deposit_withdrawal_notification_email')
            .maybeSingle();
          
          if ((data as any)?.value) {
            email = (data as any).value || '';
          }
        } catch (e) {
          console.warn('Error fetching notification email:', e);
        }
      }
      
      setDepositWithdrawalEmail(email);
      
      // Fetch header links
      const { data: headerData } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'header_links')
        .maybeSingle();
      
      if ((headerData as any)?.value) {
        try {
          const links = JSON.parse((headerData as any).value);
          // Ensure all links have order values, assign if missing
          const linksWithOrder = links.map((link: LinkItem, index: number) => ({
            ...link,
            order: link.order !== undefined ? link.order : index
          }));
          // Sort by order
          linksWithOrder.sort((a: LinkItem, b: LinkItem) => (a.order || 0) - (b.order || 0));
          setHeaderLinks(linksWithOrder);
        } catch (e) {
          console.warn('Failed to parse header links:', e);
        }
      } else {
        // Default header links from Navbar.tsx with order
        setHeaderLinks([
          { label: 'Dashboard', to: '/dashboard', order: 1 },
          { label: 'Accounts', to: '/meta-trader-accounts', order: 2 },
          { label: 'Referrals', to: '/referrals', order: 3 },
          { label: 'Catholic', to: '/blog', order: 4 },
          { label: 'Contact', to: '/contact', order: 5 },
        ]);
      }

      // Fetch footer links
      const { data: footerData } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'footer_links')
        .maybeSingle();
      
      if ((footerData as any)?.value) {
        try {
          const links = JSON.parse((footerData as any).value);
          // Ensure all links have order values, assign if missing
          const linksWithOrder = links.map((link: LinkItem, index: number) => ({
            ...link,
            order: link.order !== undefined ? link.order : index
          }));
          // Sort by order
          linksWithOrder.sort((a: LinkItem, b: LinkItem) => (a.order || 0) - (b.order || 0));
          setFooterLinks(linksWithOrder);
        } catch (e) {
          console.warn('Failed to parse footer links:', e);
        }
      } else {
        // Default footer links from Footer.tsx with order
        setFooterLinks([
          { label: 'Quick Links', to: '/#', order: 1 },
          { label: 'Home', to: '/', order: 2 },
          { label: 'About us', to: '/about', order: 3 },
          { label: 'Download app', to: '/downloads', order: 4 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching app settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveAppSettings = async () => {
    try {
      setSavingSettings(true);

      // Save deposit/withdrawal notification email
      await supabase
        .from('app_settings' as any)
        .upsert({
          key: 'deposit_withdrawal_notification_email',
          value: depositWithdrawalEmail,
          description: 'Email address to receive notifications when deposit/withdrawal requests are approved or declined',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      // Ensure header links have order and sort them
      const sortedHeaderLinks = [...headerLinks]
        .map((link, index) => ({ ...link, order: link.order !== undefined ? link.order : index }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Save header links
      await supabase
        .from('app_settings' as any)
        .upsert({
          key: 'header_links',
          value: JSON.stringify(sortedHeaderLinks),
          description: 'Navigation links for the header/navbar',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      // Ensure footer links have order and sort them
      const sortedFooterLinks = [...footerLinks]
        .map((link, index) => ({ ...link, order: link.order !== undefined ? link.order : index }))
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Save footer links
      await supabase
        .from('app_settings' as any)
        .upsert({
          key: 'footer_links',
          value: JSON.stringify(sortedFooterLinks),
          description: 'Navigation links for the footer',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'key'
        });

      toast({
        title: "Success",
        description: "App settings saved successfully",
      });
    } catch (error: any) {
      console.error('Error saving app settings:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save app settings",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const addHeaderLink = () => {
    const maxOrder = headerLinks.length > 0 
      ? Math.max(...headerLinks.map(link => link.order || 0))
      : 0;
    setHeaderLinks([...headerLinks, { label: '', to: '', order: maxOrder + 1 }]);
  };

  const removeHeaderLink = (index: number) => {
    setHeaderLinks(headerLinks.filter((_, i) => i !== index));
  };

  const updateHeaderLink = (index: number, field: 'label' | 'to', value: string) => {
    const updated = [...headerLinks];
    updated[index] = { ...updated[index], [field]: value };
    setHeaderLinks(updated);
  };

  const moveHeaderLink = (sortedIndex: number, direction: 'up' | 'down') => {
    const sorted = [...headerLinks]
      .map((link, idx) => ({ ...link, order: link.order !== undefined ? link.order : idx }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const newIndex = direction === 'up' ? sortedIndex - 1 : sortedIndex + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const updated = [...headerLinks];
    const currentLink = sorted[sortedIndex];
    const targetLink = sorted[newIndex];
    
    // Find indices in original array
    const currentIndex = updated.findIndex(l => l.label === currentLink.label && l.to === currentLink.to);
    const targetIndex = updated.findIndex(l => l.label === targetLink.label && l.to === targetLink.to);
    
    if (currentIndex === -1 || targetIndex === -1) return;
    
    // Swap orders
    const tempOrder = currentLink.order!;
    updated[currentIndex].order = targetLink.order!;
    updated[targetIndex].order = tempOrder;
    
    setHeaderLinks(updated);
  };

  const addFooterLink = () => {
    const maxOrder = footerLinks.length > 0 
      ? Math.max(...footerLinks.map(link => link.order || 0))
      : 0;
    setFooterLinks([...footerLinks, { label: '', to: '', order: maxOrder + 1 }]);
  };

  const removeFooterLink = (index: number) => {
    setFooterLinks(footerLinks.filter((_, i) => i !== index));
  };

  const updateFooterLink = (index: number, field: 'label' | 'to', value: string) => {
    const updated = [...footerLinks];
    updated[index] = { ...updated[index], [field]: value };
    setFooterLinks(updated);
  };

  const moveFooterLink = (sortedIndex: number, direction: 'up' | 'down') => {
    const sorted = [...footerLinks]
      .map((link, idx) => ({ ...link, order: link.order !== undefined ? link.order : idx }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const newIndex = direction === 'up' ? sortedIndex - 1 : sortedIndex + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;

    const updated = [...footerLinks];
    const currentLink = sorted[sortedIndex];
    const targetLink = sorted[newIndex];
    
    // Find indices in original array
    const currentIndex = updated.findIndex(l => l.label === currentLink.label && l.to === currentLink.to);
    const targetIndex = updated.findIndex(l => l.label === targetLink.label && l.to === targetLink.to);
    
    if (currentIndex === -1 || targetIndex === -1) return;
    
    // Swap orders
    const tempOrder = currentLink.order!;
    updated[currentIndex].order = targetLink.order!;
    updated[targetIndex].order = tempOrder;
    
    setFooterLinks(updated);
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading settings</h2> 
        </div>
      </div>
    );
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">You don't have permission to access this page.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">App Settings</h1>
          <p className="text-muted-foreground mt-2 mb-2">
            Manage application-wide settings and configurations
          </p>
        </div>
      </div>

      {/* Email Notification Settings */}
      {/* <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
        <Card className="bg-black rounded-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Email Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure email addresses for system notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-withdrawal-email">
                Deposit/Withdrawal Notification Email
              </Label>
              <Input
                id="deposit-withdrawal-email"
                type="email"
                placeholder="admin@example.com"
                value={depositWithdrawalEmail}
                onChange={(e) => setDepositWithdrawalEmail(e.target.value)}
                className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0'
              />
              <p className="text-sm text-muted-foreground">
                Email address that will receive notifications when deposit or withdrawal requests are approved or declined
              </p>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Header Links Settings */}
      <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
        <Card className="bg-black rounded-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Header Navigation Links</CardTitle>
            </div>
            <CardDescription>
              Manage the navigation links displayed in the header/navbar (for logged-in users)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-0">
            <div className="space-y-4">
              {headerLinks
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((link, sortedIndex) => {
                  const originalIndex = headerLinks.findIndex(l => l === link);
                  return (
                    <div key={`${link.order}-${sortedIndex}`} className="flex gap-3 items-center">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHeaderLink(sortedIndex, 'up')}
                          disabled={sortedIndex === 0}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-[8px] border-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveHeaderLink(sortedIndex, 'down')}
                          disabled={sortedIndex === headerLinks.length - 1}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-[8px] border-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Link Label"
                          value={link.label}
                          onChange={(e) => updateHeaderLink(originalIndex, 'label', e.target.value)}
                          className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties} 
                        />
                        <Input
                          placeholder="Link URL (e.g., /dashboard)"
                          value={link.to}
                          onChange={(e) => updateHeaderLink(originalIndex, 'to', e.target.value)}
                          className='rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties} 
                        />
                      </div>

                      
                         
                     
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeHeaderLink(originalIndex)}
                       className="text-white bg-red-600 hover:text-white hover:bg-red-700 rounded-[8px] h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>  

                    

                    </div>
                  );
                })}


                <div className="px-11 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={addHeaderLink}
                className="w-full rounded-[8px] border-0 bg-primary hover:bg-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Header Link
              </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Links Settings */}
      <div className="bg-gradient-pink-to-yellow hover:glow-primary w-full rounded-sm border-0 p-[2px] shadow-none">
        <Card className="bg-black rounded-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Footer Navigation Links</CardTitle>
            </div>
            <CardDescription>
              Manage the navigation links displayed in the footer
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 sm:pt-0">
            <div className="space-y-4">
              {footerLinks
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((link, sortedIndex) => {
                  const originalIndex = footerLinks.findIndex(l => l === link);
                  return (
                    <div key={`${link.order}-${sortedIndex}`} className="flex gap-3 items-center">
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveFooterLink(sortedIndex, 'up')}
                          disabled={sortedIndex === 0}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-[8px] border-0"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveFooterLink(sortedIndex, 'down')}
                          disabled={sortedIndex === footerLinks.length - 1}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-[8px] border-0"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Link Label"
                          value={link.label}
                          onChange={(e) => updateFooterLink(originalIndex, 'label', e.target.value)}
                          className='rounded-[8px] border-0 shadow-none mt-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                        />
                        <Input
                          placeholder="Link URL (e.g., /about)"
                          value={link.to}
                          onChange={(e) => updateFooterLink(originalIndex, 'to', e.target.value)}
                          className='rounded-[8px] border-0 shadow-none mt-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFooterLink(originalIndex)}
                        className="text-white bg-red-600 hover:text-white hover:bg-red-700 rounded-[8px] h-10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}

<div className="px-11 pt-0">
              <Button
                type="button"
                variant="outline"
                onClick={addFooterLink}
                className="w-full rounded-[8px] border-0 bg-primary hover:bg-primary/80"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Footer Link
              </Button></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSaveAppSettings}
          disabled={savingSettings || loadingSettings}
          className="rounded-[8px] border-0 hover:bg-primary/80"
        >
          {savingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Settings className="mr-2 h-4 w-4" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
