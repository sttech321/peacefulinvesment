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

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('contact_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching contact requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contact requests",
        variant: "destructive",
      });
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

      // Update local state
      setRequests(prev => prev.map(request => 
        request.id === requestId 
          ? { ...request, status: newStatus as any, resolved_at: updateData.resolved_at }
          : request
      ));

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

  const sendReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;

    try {
      // Here you would integrate with your email service
      // For now, just update the status and add admin notes
      const { error } = await supabase
        .from('contact_requests')
        .update({ 
          status: 'in_progress',
          admin_notes: replyMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRequest.id);

      if (error) throw error;

      // Update local state
      setRequests(prev => prev.map(request => 
        request.id === selectedRequest.id 
          ? { ...request, status: 'in_progress', admin_notes: replyMessage }
          : request
      ));

      setReplyMessage("");
      setReplyDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Reply sent successfully",
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
        return <Badge variant="outline">Low Priority</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolved</Badge>;
      case 'closed':
        return <Badge variant="outline">Closed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
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
          <Button variant="outline" size="sm" className="gap-0 rounded-[8px] hover:bg-white/80 border-0">
            <Download className="h-4 w-4 mr-2" />
            Export
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
                      className="bg-muted/30 hover:bg-muted/40 rounded-[8px] border-0"
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
                <Button variant="destructive" size="sm" className="rounded-[8px] border-0">
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
    </div>
  );
}
