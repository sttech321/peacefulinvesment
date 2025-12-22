import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DollarSign, 
  CreditCard,
  Search, 
  Filter, 
  Eye, 
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  User,
  Calendar,
  Download,
  Mail,
  FileText,
  Globe
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToPDF, formatDataForExport } from "@/utils/exportUtils";
import { Request } from "@/hooks/useRequests";

interface RequestWithUser extends Request {
  user_email?: string;
  user_name?: string;
}

export default function AdminRequests() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [requests, setRequests] = useState<RequestWithUser[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
        },
        (payload) => {
          console.log('Request change received:', payload);
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      console.log('[AdminRequests] Starting to fetch all requests...');
      console.log('[AdminRequests] Is Admin:', isAdmin());
      console.log('[AdminRequests] User ID:', user?.id);
      
      let requestsData: any[] = [];

      // Try to fetch via edge function first (bypasses RLS)
      if (isAdmin()) {
        try {
          console.log('[AdminRequests] Attempting to fetch via edge function...');
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('get-all-requests');
          
          if (!edgeError && edgeData?.success) {
            requestsData = edgeData.data || [];
            console.log('[AdminRequests] Successfully fetched via edge function:', requestsData.length, 'records');
          } else {
            console.warn('[AdminRequests] Edge function failed, falling back to direct query:', edgeError);
            throw new Error('Edge function failed');
          }
        } catch (edgeErr) {
          console.log('[AdminRequests] Falling back to direct Supabase query...');
          // Fallback to direct query
          const { data, error } = await supabase
            .from('requests')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) throw error;
          requestsData = data || [];
          console.log('[AdminRequests] Direct query result:', requestsData.length, 'records');
        }
      } else {
        // Regular user - direct query (will be filtered by RLS)
        const { data, error } = await supabase
          .from('requests')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        requestsData = data || [];
      }

      if (requestsData.length === 0) {
        console.log('[AdminRequests] No requests found');
        setRequests([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(requestsData.map((req: any) => req.user_id))];
      console.log('[AdminRequests] Unique user IDs:', uniqueUserIds.length);

      // Fetch all profiles at once for better performance
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      // Create a map of user_id to profile info
      const profileMap = new Map(
        (profilesData || []).map((profile: any) => [
          profile.user_id,
          {
            full_name: profile.full_name || 'Unknown',
            email: profile.email || null,
          },
        ])
      );

      // Get unique user IDs from requests that don't have email in profiles
      const uniqueUserIdsWithoutEmail = [...new Set(
        requestsData
          .filter((req: any) => {
            const profileInfo = profileMap.get(req.user_id);
            return !profileInfo?.email;
          })
          .map((req: any) => req.user_id)
      )];
      
      // Fetch user emails via edge function only for users without email in profiles
      let userEmailsMap: Record<string, string> = {};
      if (uniqueUserIdsWithoutEmail.length > 0) {
        try {
          const { data: emailsData, error: emailsError } = await supabase.functions.invoke('get-user-emails', {
            body: { user_ids: uniqueUserIdsWithoutEmail }
          });
          
          if (!emailsError && emailsData?.success) {
            userEmailsMap = emailsData.data || {};
            console.log('[AdminRequests] Fetched user emails via edge function:', Object.keys(userEmailsMap).length, 'emails');
          } else {
            console.warn('[AdminRequests] Failed to fetch user emails via edge function:', emailsError);
          }
        } catch (emailErr) {
          console.warn('[AdminRequests] Error fetching user emails:', emailErr);
        }
      }

      // Map requests with user information
      const requestsWithUsers: RequestWithUser[] = (requestsData || []).map((req) => {
        const profileInfo = profileMap.get(req.user_id);
        // Use email from profiles first, fallback to edge function, then to user_id prefix
        const userEmail = profileInfo?.email || userEmailsMap[req.user_id] || req.user_id.slice(0, 8) + '...';
        const userName = profileInfo?.full_name || 'Unknown User';

        return {
          ...req,
          user_email: userEmail,
          user_name: userName,
        };
      });

      console.log('[AdminRequests] Final requests with user info:', requestsWithUsers.length);
      setRequests(requestsWithUsers);
    } catch (error: any) {
      console.error('[AdminRequests] Error fetching requests:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch requests",
        variant: "destructive",
      });
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(request => request.type === typeFilter);
    }

    setFilteredRequests(filtered);
  };

  const getTypeIcon = (type: string) => {
    return type === 'deposit' ? (
      <DollarSign className="h-5 w-5 text-primary" />
    ) : (
      <CreditCard className="h-5 w-5 text-primary" />
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "inprogress" | "outline"> = {
      pending: "secondary",
      processing: "inprogress",
      completed: "default",
      rejected: "destructive",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);

      // Update request status
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'processing',
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Send notification email to user who submitted the request
      let emailSent = false;
      let emailErrorMsg = '';
      
      if (selectedRequest.user_email) {
        try {
          console.log('Attempting to send approval notification email to:', selectedRequest.user_email);
          
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-request-notification', {
            body: {
              user_email: selectedRequest.user_email,
              user_name: selectedRequest.user_name || 'User',
              request_id: selectedRequest.id,
              request_type: selectedRequest.type,
              amount: selectedRequest.amount,
              currency: selectedRequest.currency,
              status: 'processing',
              admin_notes: adminNotes || undefined,
            }
          });

          console.log('Email function response:', { emailData, emailError });

          if (emailError) {
            console.error('Email notification error:', emailError);
            emailErrorMsg = emailError.message || 'Unknown error';
          } else if (emailData?.success === true) {
            emailSent = true;
            console.log('Email sent successfully');
          } else {
            console.warn('Email notification returned unsuccessful:', emailData);
            emailErrorMsg = emailData?.error || 'Email service returned unsuccessful';
          }
        } catch (emailErr: any) {
          console.error('Error sending user notification email:', emailErr);
          emailErrorMsg = emailErr?.message || 'Failed to invoke email function';
        }
      }

      // Show final toast message
      if (emailSent) {
        toast({
          title: "Success",
          description: `Request approved successfully. Notification email sent to ${selectedRequest.user_email}`,
        });
      } else if (!selectedRequest.user_email) {
        toast({
          title: "Success",
          description: "Request approved successfully. No email sent (user email not available).",
        });
      } else {
        toast({
          title: "Request Approved",
          description: `Request approved successfully. ${emailErrorMsg ? `Email notification failed: ${emailErrorMsg}` : 'Failed to send notification email to user.'}`,
          variant: emailErrorMsg ? "destructive" : "default",
        });
      }

      setApproveDialogOpen(false);
      setAdminNotes("");
      await fetchRequests();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!selectedRequest) return;

    try {
      setProcessing(true);

      // Update request status
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Send notification email to user who submitted the request
      let emailSent = false;
      let emailErrorMsg = '';
      
      if (selectedRequest.user_email) {
        try {
          console.log('Attempting to send decline notification email to:', selectedRequest.user_email);
          
          const { data: emailData, error: emailError } = await supabase.functions.invoke('send-request-notification', {
            body: {
              user_email: selectedRequest.user_email,
              user_name: selectedRequest.user_name || 'User',
              request_id: selectedRequest.id,
              request_type: selectedRequest.type,
              amount: selectedRequest.amount,
              currency: selectedRequest.currency,
              status: 'rejected',
              admin_notes: adminNotes || undefined,
            }
          });

          console.log('Email function response:', { emailData, emailError });

          if (emailError) {
            console.error('Email notification error:', emailError);
            emailErrorMsg = emailError.message || 'Unknown error';
          } else if (emailData?.success === true) {
            emailSent = true;
            console.log('Email sent successfully');
          } else {
            console.warn('Email notification returned unsuccessful:', emailData);
            emailErrorMsg = emailData?.error || 'Email service returned unsuccessful';
          }
        } catch (emailErr: any) {
          console.error('Error sending user notification email:', emailErr);
          emailErrorMsg = emailErr?.message || 'Failed to invoke email function';
        }
      }

      // Show final toast message
      if (emailSent) {
        toast({
          title: "Success",
          description: `Request declined successfully. Notification email sent to ${selectedRequest.user_email}`,
        });
      } else if (!selectedRequest.user_email) {
        toast({
          title: "Success",
          description: "Request declined successfully. No email sent (user email not available).",
        });
      } else {
        toast({
          title: "Request Declined",
          description: `Request declined successfully. ${emailErrorMsg ? `Email notification failed: ${emailErrorMsg}` : 'Failed to send notification email to user.'}`,
          variant: emailErrorMsg ? "destructive" : "default",
        });
      }

      setRejectDialogOpen(false);
      setAdminNotes("");
      await fetchRequests();
    } catch (error: any) {
      console.error('Error declining request:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to decline request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    const exportData = filteredRequests.map(req => ({
      ID: req.id,
      Type: req.type,
      Amount: `${req.amount} ${req.currency}`,
      Status: req.status,
      'User Name': req.user_name || 'Unknown',
      'User Email': req.user_email || 'N/A',
      'Created At': formatDate(req.created_at),
      'Updated At': formatDate(req.updated_at),
    }));

    if (format === 'excel') {
      exportToExcel(exportData, 'deposit-withdrawal-requests', 'Requests');
    } else {
      await exportToPDF(exportData, 'deposit-withdrawal-requests', 'Deposit/Withdrawal Requests');
    }
  };

  if (!isAdmin()) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">You don't have permission to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Deposit/Withdrawal Requests</h1>
          <p className="text-muted-foreground mt-1">Manage all deposit and withdrawal requests</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={filteredRequests.length === 0}
            className="gap-0 rounded-[8px] hover:bg-white/80 border-0"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={filteredRequests.length === 0}
            className="gap-0 rounded-[8px] hover:bg-white/80 border-0"
          >
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export PDF</span>
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Requests</CardTitle>
            <FileText className="h-5 w-5 text-[var(--yellowcolor)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{requests.length}</div>
            <p className="text-sm text-muted-foreground">
              Deposit & withdrawal requests
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Pending Requests</CardTitle>
            <AlertCircle className="h-5 w-5 text-[var(--yellowcolor)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {requests.filter(r => r.status === 'pending').length}
            </div>
            <p className="text-sm text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Approved</CardTitle>
            <CheckCircle className="h-5 w-5 text-[var(--yellowcolor)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {requests.filter(r => r.status === 'processing' || r.status === 'completed').length}
            </div>
            <p className="text-sm text-muted-foreground">
              Processed requests
            </p>
          </CardContent>
        </Card>

        <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Declined</CardTitle>
            <XCircle className="h-5 w-5 text-[var(--yellowcolor)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {requests.filter(r => r.status === 'rejected').length}
            </div>
            <p className="text-sm text-muted-foreground">
              Rejected requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter deposit and withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 rounded-[8px] placeholder:text-sm border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
                <SelectItem value="withdrawal">Withdrawal</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center sm:justify-start">
              <Badge variant="outline" className="py-2 px-4 rounded-[8px] h-[40px] mt-1">
                {filteredRequests.length} requests
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            All deposit and withdrawal requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          ) : filteredRequests.length > 0 ? (
            <div className="space-y-4">
              {filteredRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-lg gap-4"
                >
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      {getTypeIcon(request.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium capitalize text-white truncate">
                          {request.type} Request
                        </p>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-white/80 mb-1 truncate">
                        <User className="h-3 w-3 inline mr-1" />
                        {request.user_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-white/70 mb-1 truncate">
                        <Mail className="h-3 w-3 inline mr-1" />
                        {request.user_email || 'No email'}
                      </p>
                      <p className="text-sm text-white/90 font-medium mb-1">
                        {request.amount.toLocaleString()} {request.currency}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(request.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {request.status === 'pending' && (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setApproveDialogOpen(true);
                              }}
                              className="text-white bg-green-600 hover:bg-green-700 hover:text-white rounded-[8px]"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setRejectDialogOpen(true);
                              }}
                              className="text-white bg-red-600 hover:bg-red-700 hover:text-white rounded-[8px]"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          
                        </Tooltip>
                      </>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRequest(request);  
                            setRequestDetailsOpen(true);
                          }}
                          className="bg-muted/20 hover:bg-muted/40 rounded-[8px]"
                        >
                          <Eye className="h-4 w-4 text-white" />
                        </Button>
                      </TooltipTrigger>
                      
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-primary text-white mx-auto mb-4" />
              <p className="text-muted-foreground">No requests found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-[350px] sm:max-w-md rounded-md bg-background text-foreground border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  {getTypeIcon(selectedRequest.type)}
                </div>
                <div>
                  <p className="font-medium capitalize text-foreground">{selectedRequest.type} Request</p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedRequest.user_name || 'Unknown'}
                  </p>
                  <p className="text-xs text-foreground/70">
                    {selectedRequest.user_email || 'No email'}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="text-sm font-medium text-foreground">{selectedRequest.amount.toLocaleString()} {selectedRequest.currency}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Name:</span>
                  <span className="text-sm font-medium text-foreground">{selectedRequest.user_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm font-medium text-foreground break-all">{selectedRequest.user_email || 'No email'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm text-foreground">{formatDate(selectedRequest.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Updated:</span>
                  <span className="text-sm text-foreground">{formatDate(selectedRequest.updated_at)}</span>
                </div>
              </div>

              {selectedRequest.description && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Description:</p>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedRequest.description}
                  </p>
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Notes:</p>
                  <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={() => {
                      setRequestDetailsOpen(false);
                      setApproveDialogOpen(true);
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-0 rounded-[8px]"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setRequestDetailsOpen(false);
                      setRejectDialogOpen(true);
                    }}
                    variant="destructive"
                    className="flex-1  gap-0 rounded-[8px]"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this request? An email notification will be sent.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  placeholder="Add any notes about this approval..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className='mt-1 rounded-[8px]   shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 resize-none' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setApproveDialogOpen(false);
                    setAdminNotes("");
                  }}
                  className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700 rounded-[8px] text-white gap-0"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline this request? An email notification will be sent.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (Optional)</label>
                <Textarea
                  placeholder="Add reason for declining this request..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  className='mt-1 rounded-[8px]   shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 resize-none' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectDialogOpen(false);
                    setAdminNotes("");
                  }}
                  className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={processing}
                  variant="destructive"
                  className="rounded-[8px] border-0 gap-0"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Decline
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

