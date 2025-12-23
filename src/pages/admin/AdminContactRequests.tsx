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
  MessageSquare, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Reply,
  Download,
  Mail,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Phone,
  User
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToPDF, formatDataForExport } from "@/utils/exportUtils";

interface ContactRequest {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  subject: string;
  priority: 'low' | 'medium' | 'high';
  message: string;
  contact_method: 'email' | 'phone';
  status: 'pending' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  admin_notes?: string;
}

export default function AdminContactRequests() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<ContactRequest | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchRequests();

    // Set up real-time subscription for contact_requests table
    const channel = supabase
      .channel('contact-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'contact_requests',
        },
        (payload) => {
          console.log('Contact request change received:', payload);
          // Refresh the list when any change occurs
          fetchRequests();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      console.log('[AdminContactRequests] Fetching contact requests...');
      
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminContactRequests] Supabase error:', error);
        throw error;
      }

      console.log('[AdminContactRequests] Raw data received:', data?.length || 0, 'records');

      // Map and validate the data to match the ContactRequest interface
      const mappedData: ContactRequest[] = (data || []).map((item: any) => ({
        id: item.id,
        full_name: item.full_name || '',
        email: item.email || '',
        phone: item.phone || undefined,
        subject: item.subject || '',
        priority: (['low', 'medium', 'high'].includes(item.priority?.toLowerCase()) 
          ? item.priority.toLowerCase() 
          : 'medium') as 'low' | 'medium' | 'high',
        message: item.message || '',
        contact_method: (item.contact_method === 'phone' ? 'phone' : 'email') as 'email' | 'phone',
        status: (['pending', 'in_progress', 'resolved', 'closed'].includes(item.status?.toLowerCase())
          ? item.status.toLowerCase()
          : 'pending') as 'pending' | 'in_progress' | 'resolved' | 'closed',
        created_at: item.created_at || new Date().toISOString(),
        updated_at: item.updated_at || item.created_at || new Date().toISOString(),
        resolved_at: item.resolved_at || undefined,
        admin_notes: item.admin_notes || undefined,
      }));

      console.log('[AdminContactRequests] Mapped data:', mappedData.length, 'records');
      setRequests(mappedData);
    } catch (error: any) {
      console.error('[AdminContactRequests] Error fetching contact requests:', error);
      const errorMessage = error?.message || 'Failed to fetch contact requests';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      // Set empty array on error to prevent stale data
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter(request => request.priority === priorityFilter);
    }

    setFilteredRequests(filtered);
  };

  const updateRequestStatus = async (requestId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('contact_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Refresh the list to get the latest data (real-time subscription will also trigger)
      await fetchRequests();

      toast({
        title: "Success",
        description: "Request status updated successfully",
      });
    } catch (error) {
      console.error('Error updating request status:', error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) {
      console.error('[DELETE] No request to delete');
      return;
    }

    console.log('[DELETE] Starting delete for request:', requestToDelete.id);

    try {
      setDeleting(true);
      
      console.log('[DELETE] Attempting to delete from database...');
      const { data, error, count } = await supabase
        .from('contact_requests')
        .delete()
        .eq('id', requestToDelete.id)
        .select(); // Select to get confirmation

      console.log('[DELETE] Delete response:', { data, error, count });

      if (error) {
        console.error('[DELETE] Supabase error:', error);
        throw error;
      }

      // Check if deletion was successful
      if (data && data.length === 0) {
        console.warn('[DELETE] No rows deleted - record may not exist or RLS policy blocked deletion');
        toast({
          title: "Warning",
          description: "No record was deleted. You may not have permission or the record doesn't exist.",
          variant: "destructive",
        });
        return;
      }

      console.log('[DELETE] Successfully deleted, refreshing list...');
      
      // Refresh the list to get the latest data
      await fetchRequests();

      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      setRequestDetailsOpen(false);
      
      toast({
        title: "Success",
        description: "Contact request deleted successfully",
      });
    } catch (error: any) {
      console.error('[DELETE] Error deleting contact request:', error);
      const errorMessage = error?.message || error?.details || "Failed to delete contact request";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const sendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    try {
      // Send email reply using Edge Function
      const { data: emailData, error: emailError } = await supabase.functions.invoke('send-contact-reply', {
        body: {
          to_email: selectedRequest.email,
          to_name: selectedRequest.full_name,
          subject: `Re: ${selectedRequest.subject}`,
          original_message: selectedRequest.message,
          reply_message: replyMessage,
          original_subject: selectedRequest.subject,
        }
      });

      if (emailError) {
        console.error('Email sending error:', emailError);
        // Continue to update database even if email fails (non-critical)
      }

      // Update the contact request status and admin notes
      const { error: updateError } = await supabase
        .from('contact_requests')
        .update({ 
          status: 'in_progress',
          admin_notes: replyMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (updateError) throw updateError;

      // Refresh the list to get the latest data (real-time subscription will also trigger)
      await fetchRequests();

      setReplyMessage("");
      setReplyDialogOpen(false);
      
      toast({
        title: "Success",
        description: emailError 
          ? "Reply saved successfully, but email sending failed. Please try again." 
          : "Reply sent successfully!",
        variant: emailError ? "default" : "default",
      });
    } catch (error) {
      console.error('Error sending reply:', error);
      toast({
        title: "Error",
        description: "Failed to send reply",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-white">Low Priority</Badge>;
      default:
        return <Badge variant="outline" className="bg-white">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-white">Closed</Badge>;
      default:
        return <Badge variant="outline" className="bg-white">Unknown</Badge>;
    }
  };

  const getContactMethodIcon = (method: string) => {
    return method === 'phone' ? <Phone className="h-4 w-4" /> : <Mail className="h-4 w-4" />;
  };

  const getPendingRequestsCount = () => {
    return requests.filter(request => request.status === 'pending').length;
  };

  const getHighPriorityCount = () => {
    return requests.filter(request => request.priority === 'high').length;
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      // Use filtered requests if filters are applied, otherwise use all requests
      const dataToExport = filteredRequests.length > 0 && (statusFilter !== 'all' || priorityFilter !== 'all' || searchTerm)
        ? filteredRequests
        : requests;

      if (dataToExport.length === 0) {
        toast({
          title: "No Data",
          description: "No contact requests to export",
          variant: "destructive",
        });
        return;
      }

      const formattedData = formatDataForExport(dataToExport, 'requests');
      
      if (type === 'excel') {
        const result = exportToExcel(formattedData, 'contact_requests_report', 'Contact Requests');
        if (result.success) {
          toast({
            title: "Success",
            description: `Exported ${dataToExport.length} contact request(s) to Excel successfully`,
          });
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to export to Excel",
            variant: "destructive",
          });
        }
      } else {
        const result = await exportToPDF(formattedData, 'contact_requests_report', 'Contact Requests Report');
        if (result.success) {
          toast({
            title: "Success",
            description: `Exported ${dataToExport.length} contact request(s) to PDF successfully`,
          });
        } else {
          toast({
            title: "Error",
            description: result.message || "Failed to export to PDF",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error exporting contact requests:', error);
      toast({
        title: "Error",
        description: "Failed to export contact requests",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Requests</h2>
          <p className="text-muted-foreground">Fetching contact requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Contact Requests</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer support requests
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-0 rounded-[8px] hover:bg-white/80 border-0"
            onClick={() => handleExport('excel')}
            disabled={loading || requests.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-0 rounded-[8px] hover:bg-white/80 border-0"
            onClick={() => handleExport('pdf')}
            disabled={loading || requests.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Requests</CardTitle>
            <MessageSquare className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{requests.length}</div>
            <p className="text-sm text-muted-foreground">
              {getPendingRequestsCount()} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">High Priority</CardTitle>
            <AlertCircle className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{getHighPriorityCount()}</div>
            <p className="text-sm text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Resolved</CardTitle>
            <CheckCircle className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requests.filter(r => r.status === 'resolved').length}
            </div>
            <p className="text-sm text-muted-foreground">
              Successfully handled
            </p>
          </CardContent>
        </Card>

        <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Avg Response</CardTitle>
            <Clock className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2.4h</div>
            <p className="text-sm text-muted-foreground">
              Response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Search and filter contact requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="py-2 px-4 h-10 rounded-[8px] mt-1">
                {filteredRequests.length} requests
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card className="border-muted/20  bg-white/5 border rounded-lg p-4">
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            All customer contact requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRequests.length > 0 ? (
              filteredRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center mt-1">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-white">{request.subject}</p>
                        {getPriorityBadge(request.priority)}
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {request.full_name} • {request.email}
                      </p>
                      <p className="text-xs text-muted-foreground flex gap-1 mt-1">
                        {formatDate(request.created_at)} • {getContactMethodIcon(request.contact_method)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);
                        setReplyDialogOpen(true);
                      }}
                      className="gap-0 rounded-[8px] border-0"
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Select
                      value={request.status}
                      onValueChange={(value) => updateRequestStatus(request.id, value)}
                    >
                      <SelectTrigger  className='w-22 h-[36px] rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedRequest(request);  
                        setRequestDetailsOpen(true);
                      }}
                      className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                    >
                      <Eye className="h-5 w-5 text-white" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">No requests found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Request Details Dialog */}
      <Dialog open={requestDetailsOpen} onOpenChange={setRequestDetailsOpen}>
        <DialogContent className="max-w-[350px] sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedRequest.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.full_name}
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  {getPriorityBadge(selectedRequest.priority)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Contact Method:</span>
                  <div className="flex items-center space-x-1">
                    {getContactMethodIcon(selectedRequest.contact_method)}
                    <span className="text-sm capitalize">{selectedRequest.contact_method}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <span className="text-sm">{selectedRequest.email}</span>
                </div>
                {selectedRequest.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Phone:</span>
                    <span className="text-sm">{selectedRequest.phone}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">{formatDate(selectedRequest.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Updated:</span>
                  <span className="text-sm">{formatDate(selectedRequest.updated_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Message:</p>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  {selectedRequest.message}
                </p>
              </div>

              {selectedRequest.admin_notes && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Admin Notes:</p>
                  <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-[8px] border-0"
                  onClick={() => {
                    setRequestDetailsOpen(false);
                    setReplyDialogOpen(true);
                  }}
                >
                  <Reply className="h-4 w-4 mr-1" />
                  Reply
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="rounded-[8px] border-0"
                  onClick={() => {
                    setRequestToDelete(selectedRequest);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Dialog */}
      <Dialog open={replyDialogOpen} onOpenChange={setReplyDialogOpen}>
        <DialogContent className="max-w-[350px] sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle>Send Reply</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Reply to: {selectedRequest?.full_name} ({selectedRequest?.email})
              </p>
              <Textarea
                placeholder="Enter your reply message..."
                value={replyMessage}
                className="rounded-[8px] shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setReplyDialogOpen(false)} className="rounded-[8px] border-0">
                Cancel
              </Button>
              <Button onClick={sendReply} disabled={!replyMessage.trim()} className="rounded-[8px] border-0 hover:bg-primary/80">
                Send Reply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[350px] sm:max-w-md rounded-md">
          <DialogHeader>
            <DialogTitle>Delete Contact Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {requestToDelete && (
            <div className="space-y-4">
              <div className="bg-muted/20 p-3 rounded-lg">
                <p className="text-sm font-medium">{requestToDelete.subject}</p>
                <p className="text-sm text-muted-foreground">
                  From: {requestToDelete.full_name} ({requestToDelete.email})
                </p>
              </div>
              <div className="flex items-center justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setRequestToDelete(null);
                  }}
                  className="rounded-[8px] border-0"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteRequest}
                  disabled={deleting}
                  className="rounded-[8px] border-0"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
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
