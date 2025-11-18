import React from 'react';
import { VerificationRequest } from '@/hooks/useVerification';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  FileText,
  Calendar,
  User
} from 'lucide-react';

interface VerificationHistoryProps {
  requests: VerificationRequest[];
}

const getStatusConfig = (status: string) => {
  const configs = {
    pending: {
      icon: Clock,
      color: 'bg-yellow-500',
      badgeVariant: 'secondary' as const,
      text: 'Pending Review'
    },
    approved: {
      icon: CheckCircle,
      color: 'bg-green-500',
      badgeVariant: 'default' as const,
      text: 'Approved'
    },
    rejected: {
      icon: XCircle,
      color: 'bg-red-500',
      badgeVariant: 'destructive' as const,
      text: 'Rejected'
    },
    more_info_required: {
      icon: AlertCircle,
      color: 'bg-orange-500',
      badgeVariant: 'secondary' as const,
      text: 'More Info Required'
    }
  };
  return configs[status as keyof typeof configs] || configs.pending;
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const VerificationHistory: React.FC<VerificationHistoryProps> = ({ requests }) => {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">No Verification History</h3>
        <p className="text-muted-foreground">
          You haven't submitted any verification requests yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => {
        const config = getStatusConfig(request.status);
        const StatusIcon = config.icon;

        return (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${config.color}`}>
                    <StatusIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <Badge variant={config.badgeVariant}>
                      {config.text}
                    </Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      Request #{request.id.slice(0, 8)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Submitted:</span>
                  <span>{formatDate(request.submitted_at)}</span>
                </div>

                {request.reviewed_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Reviewed:</span>
                    <span>{formatDate(request.reviewed_at)}</span>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Submitted Documents:</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {request.documents.map((doc, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm capitalize">
                        {doc.type.replace('_', ' ')}
                      </span>
                      <Badge 
                        variant={doc.status === 'accepted' ? 'default' : 'secondary'}
                        className="ml-auto text-xs"
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Admin Feedback */}
              {request.reason && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-1">Admin Feedback:</h4>
                  <p className="text-sm text-muted-foreground">{request.reason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};