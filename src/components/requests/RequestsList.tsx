import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRequests, Request } from "@/hooks/useRequests";
import { Loader2, DollarSign, CreditCard, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

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
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'rejected':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const RequestsList = () => {
  const { requests, loading } = useRequests();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <DollarSign className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No requests yet</h3>
            <p className="text-muted-foreground">
              Create your first deposit or withdrawal request to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  request.type === 'deposit' 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  {request.type === 'deposit' ? (
                    <DollarSign className="h-5 w-5" />
                  ) : (
                    <CreditCard className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold capitalize">
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
                <p className="font-medium">
                  {request.amount.toLocaleString()} {request.currency}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium">{request.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Request ID</p>
                <p className="font-mono text-sm">{request.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {format(new Date(request.updated_at), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            {request.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{request.description}</p>
              </div>
            )}

            {request.admin_notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                <p className="text-sm bg-muted p-3 rounded-md">{request.admin_notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default RequestsList;