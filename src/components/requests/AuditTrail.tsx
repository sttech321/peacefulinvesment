import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ChevronUp, Activity, User, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";

interface AuditLogEntry {
  id: string;
  request_id: string;
  user_id: string;
  action: string;
  old_values?: any;
  new_values?: any;
  admin_id?: string;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

interface AuditTrailProps {
  requestId: string;
}

const AuditTrail = ({ requestId }: AuditTrailProps) => {
  const { user } = useAuth();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (requestId) {
      fetchAuditLog();
    }
  }, [requestId]);

  const fetchAuditLog = async () => {
    try {
      const { data, error } = await supabase
        .from('request_audit_log')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLog((data || []) as AuditLogEntry[]);
    } catch (error) {
      console.error('Error fetching audit log:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (entryId: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedEntries(newExpanded);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Activity className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <User className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-green-200 hover:bg-green-300 text-green-700 border-green-500/20 ml-0">Created</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-200 hover:bg-blue-300 text-blue-700 border-blue-500/20 ml-0">Updated</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-200 hover:bg-red-300 text-red-700 border-red-500/20 ml-0">Deleted</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const getChangedFields = (oldValues: any, newValues: any) => {
    if (!oldValues || !newValues) return [];
    
    const changes: { field: string; oldValue: any; newValue: any }[] = [];
    
    Object.keys(newValues).forEach(key => {
      if (oldValues[key] !== newValues[key] && key !== 'updated_at') {
        changes.push({
          field: key,
          oldValue: oldValues[key],
          newValue: newValues[key],
        });
      }
    });
    
    return changes;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return value.toString();
    if (typeof value === 'string' && value.includes('T') && value.includes('Z')) {
      try {
        return format(new Date(value), 'PPp');
      } catch {
        return value;
      }
    }
    return value.toString();
  };

  if (loading) {
    return (
      <Card className="p-0 border-0">
        <CardHeader className="pb-0 sm:pb-0 hidden">
          <CardTitle className="flex items-center gap-2 text-lg ">
            <Activity className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 border-0">
      <CardHeader className="pb-0 sm:pb-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Audit Trail ({auditLog.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {auditLog.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="mx-auto h-12 w-12 mb-4 text-primary" />
            <p>No audit log entries found for this request.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {auditLog.map((entry) => {
              const isExpanded = expandedEntries.has(entry.id);
              const changes = getChangedFields(entry.old_values, entry.new_values);
              
              return (
                <div key={entry.id} className="border border-muted-foreground/20 rounded-[8px]">
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(entry.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between p-4 h-auto hover:bg-white/10 rounded-[8px] text-white/50 hover:text-white"
                      >
                        <div className="flex items-center gap-3">
                          {getActionIcon(entry.action)}
                          <div className="text-left">
                            <div className="flex items-center gap-2 mb-1">
                              {getActionBadge(entry.action)}
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(entry.created_at), 'PPp')}
                              </span>
                            </div>
                            {changes.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                {changes.length} field(s) changed: {changes.map(c => c.field).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-3 pt-2 border-t border-muted-foreground/20">
                        {entry.action === 'INSERT' && entry.new_values && (
                          <div>
                            <h4 className="font-medium text-white mb-2">Request Created</h4>
                            <div className="bg-green-50 p-3 rounded text-sm">
                              <p><strong>Type:</strong> {entry.new_values.type}</p>
                              <p><strong>Amount:</strong> {entry.new_values.amount} {entry.new_values.currency}</p>
                              <p><strong>Payment Method:</strong> {entry.new_values.payment_method}</p>
                              <p><strong>Status:</strong> {entry.new_values.status}</p>
                            </div>
                          </div>
                        )}
                        
                        {entry.action === 'UPDATE' && changes.length > 0 && (
                          <div>
                            <h4 className="font-medium text-blue-800 mb-2">Fields Updated</h4>
                            <div className="space-y-2">
                              {changes.map((change, index) => (
                                <div key={index} className="bg-blue-50 p-3 rounded text-sm">
                                  <p className="font-medium capitalize mb-1">{change.field.replace('_', ' ')}</p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-red-600 font-medium">From:</span>
                                      <span className="ml-2">{formatValue(change.oldValue)}</span>
                                    </div>
                                    <div>
                                      <span className="text-green-600 font-medium">To:</span>
                                      <span className="ml-2">{formatValue(change.newValue)}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {entry.reason && (
                          <div>
                            <h4 className="font-medium mb-2">Reason</h4>
                            <p className="text-sm bg-yellow-50 p-3 rounded">{entry.reason}</p>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground pt-2 border-t border-muted-foreground/20">
                          <p>Entry ID: {entry.id}</p>
                          {entry.ip_address && <p>IP Address: {entry.ip_address}</p>}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditTrail;