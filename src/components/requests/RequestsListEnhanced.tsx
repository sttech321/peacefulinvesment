import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRequests, Request } from "@/hooks/useRequests";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, DollarSign, CreditCard, Clock, CheckCircle, XCircle, AlertCircle, FileText, User, Calendar, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import DocumentUpload from "./DocumentUpload";
import AuditTrail from "./AuditTrail";
import RequestFilters from "./RequestFilters";

interface RequestDocument {
  id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description?: string;
  uploaded_at: string;
}

const getStatusIcon = (status: Request['status']) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4" />;
    case 'processing':
      return <AlertCircle className="h-4 w-4" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4" />;
    case 'rejected':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusColor = (status: Request['status']) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
  }
};

const RequestsListEnhanced = () => {
  const { requests, loading } = useRequests();
  const { toast } = useToast();
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [requestDocuments, setRequestDocuments] = useState<RequestDocument[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [filteredRequests, setFilteredRequests] = useState<Request[]>(requests);

  const fetchRequestDocuments = async (requestId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from('request_documents')
        .select('*')
        .eq('request_id', requestId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setRequestDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request);
    fetchRequestDocuments(request.id);
  };

  const sendTestNotification = async (request: Request) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-request-notification', {
        body: {
          user_email: 'user@example.com', // This would come from the user profile
          user_name: 'Test User',
          request_id: request.id,
          request_type: request.type,
          amount: request.amount,
          currency: request.currency,
          status: request.status,
          admin_notes: request.admin_notes,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Test notification sent successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send notification",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-6">
        <RequestFilters 
          requests={requests}
          onFilteredRequestsChange={setFilteredRequests}
        />
        <div className="text-center py-8">
          <DollarSign className="mx-auto h-12 w-12 mb-4 text-[var(--yellowcolor)]" />
          <h3 className="text-lg font-medium  mb-2 text-white">No requests yet</h3>
          <p className="text-muted-foreground">
            Create your first deposit or withdrawal request to get started.
          </p>
        </div>
      </div>
    );
  }

  if (selectedRequest) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" className="rounded-[8px] border-0 hover:bg-white/80" onClick={() => setSelectedRequest(null)}>
            ← Back to Requests
          </Button>
          <h2 className="text-2xl font-semibold text-white">Request Details</h2>
          <Button 
            variant="outline" 
            size="sm"
            className="ml-auto rounded-[8px] border-0 hover:bg-white/80"
            onClick={() => sendTestNotification(selectedRequest)}
          >
            Test Notification
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Request Information */}
          <Card className="lg:col-span-2">{/* Request details content remains the same */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {selectedRequest.type === 'deposit' ? (
                  <span className="bg-green-100 rounded-[100px] p-2"><DollarSign className="h-5 w-5 text-green-600" /></span>
                ) : (
                  <span className="bg-primary/10 rounded-[100px] p-2"><CreditCard className="h-5 w-5 text-primary" /></span>
                )}
                {selectedRequest.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request 
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge className={`${getStatusColor(selectedRequest.status)} flex items-center gap-1`}>
                  {getStatusIcon(selectedRequest.status)}
                  <span className="capitalize">{selectedRequest.status}</span>
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold text-sm text-muted text-right">
                  {selectedRequest.amount.toLocaleString()} {selectedRequest.currency}
                  {(selectedRequest as any).calculated_fee !== undefined && (selectedRequest as any).calculated_fee > 0 && (
                    <span className="text-sm text-muted-foreground block">
                      Fee: {((selectedRequest as any).calculated_fee).toLocaleString()} {selectedRequest.currency}
                    </span>
                  )}
                  {(selectedRequest as any).net_amount !== undefined && (selectedRequest as any).net_amount !== selectedRequest.amount && (
                    <span className="text-sm text-green-600 block">
                      Net: {((selectedRequest as any).net_amount).toLocaleString()} {selectedRequest.currency}
                    </span>
                  )}
                </span>
              </div>

              {/* <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <span className="font-medium text-sm text-muted">{selectedRequest.payment_method}</span>
              </div> */}

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Request ID</span>
                <span className="font-mono text-sm text-muted">{selectedRequest.id}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium text-sm text-muted">
                  {format(new Date(selectedRequest.created_at), 'PPP at pp')}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium text-sm text-muted">
                  {format(new Date(selectedRequest.updated_at), 'PPP at pp')}
                </span>
              </div>

 

              {selectedRequest.description && (
                <div className="pt-4 border-t border-muted-foreground/20">
                  <span className="text-muted-foreground block mb-2">Description</span>
                  <p className="text-sm p-0 rounded-md text-muted">{selectedRequest.description}</p>
                </div>
              )}

              {selectedRequest.admin_notes && (
                <div className="pt-4 border-t border-muted-foreground/20">
                  <span className="text-muted-foreground block mb-2">Admin Notes</span>
                  <p className="text-sm bg-yellow-50 border-0 p-3 rounded-[8px]">
                    {selectedRequest.admin_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Documents ({requestDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDocuments ? (
                <div className="flex items-center justify-center h-32 ">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <DocumentUpload 
                  requestId={selectedRequest.id}
                  existingDocuments={requestDocuments.map(doc => ({
                    id: doc.id,
                    filename: doc.filename,
                    file_url: doc.file_url,
                    file_type: doc.file_type,
                    file_size: doc.file_size,
                    document_type: doc.document_type,
                    description: doc.description,
                    uploaded_at: doc.uploaded_at,
                  }))}
                  onDocumentsChange={(docs) => {
                    setRequestDocuments(docs.map(doc => ({
                      id: doc.id || '',
                      filename: doc.filename,
                      file_url: doc.file_url,
                      file_type: doc.file_type,
                      file_size: doc.file_size,
                      document_type: doc.document_type,
                      description: doc.description,
                      uploaded_at: doc.uploaded_at || new Date().toISOString(),
                    })));
                  }}
                />
              )}
            </CardContent>
          </Card>

          {/* Audit Trail */}
          <Card className="p-0">
            <CardHeader className="pb-0 sm:pb-0">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-0">
              <AuditTrail requestId={selectedRequest.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RequestFilters 
        requests={requests}
        onFilteredRequestsChange={setFilteredRequests}
      />
      
      <div className="space-y-4">
        {filteredRequests.map((request) => (
        <Card 
          key={request.id} 
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleRequestClick(request)}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-[100px] ${
                  request.type === 'deposit' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-primary/10 text-primary'
                }`}>
                  {request.type === 'deposit' ? (
                    <DollarSign className="h-5 w-5" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold capitalize text-white">
                    {request.type} Request
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(request.created_at), 'MMM dd, yyyy at HH:mm')}
                  </p>
                </div>
              </div>
              <Badge className={`${getStatusColor(request.status)} flex items-center gap-1`}>
                {getStatusIcon(request.status)}
                <span className="capitalize">{request.status}</span>
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium text-muted pt-1">
                  {request.amount.toLocaleString()} {request.currency}
                </p>
              </div>
              {/* <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium text-muted pt-1">{request.payment_method}</p>
              </div> */}
              <div>
                <p className="text-sm text-muted-foreground">Request ID</p>
                <p className="font-mono text-sm text-muted pt-1">{request.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium text-muted pt-1">
                  {format(new Date(request.updated_at), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {request.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm line-clamp-2 text-white">{request.description}</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-secondary-foreground text-sm text-muted-foreground">
              Click to view details and manage documents
            </div>
          </CardContent>
        </Card>
        ))}
      </div>
    </div>
  );
};

export default RequestsListEnhanced;