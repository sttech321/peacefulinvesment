import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  User,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { exportToExcel, exportToPDF, formatDataForExport } from "@/utils/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AuditLogEntry {
  id: string;
  admin_id: string;
  user_id: string;
  verification_request_id: string | null;
  action: string;
  note: string | null;
  created_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  admin_email?: string;
  admin_name?: string;
}

export default function AdminAuditLog() {
  const { user } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();

    // Set up real-time subscription for admin_actions table
    const channel = supabase
      .channel('admin-actions-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'admin_actions',
        },
        (payload) => {
          console.log('Admin action change received:', payload);
          // Refresh the list when any change occurs
          fetchAuditLogs();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      console.log('[AdminAuditLog] Fetching admin actions...');
      
      // Fetch admin_actions with user profile information (only user_id has foreign key)
      const { data: adminActions, error } = await supabase
        .from('admin_actions')
        .select(`
          *,
          user_profile:profiles!admin_actions_user_id_fkey(user_id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminAuditLog] Supabase error:', error);
        // If join fails, try simple select
        const { data: simpleData, error: simpleError } = await supabase
          .from('admin_actions')
          .select('*')
          .order('created_at', { ascending: false });

        if (simpleError) throw simpleError;

        // Fetch profiles separately
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name');

        const profilesMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Map simple data
        const mappedLogs: AuditLogEntry[] = (simpleData || []).map((action: any) => {
          const userProfile = profilesMap.get(action.user_id);
          const adminProfile = profilesMap.get(action.admin_id);

          return {
            id: action.id,
            admin_id: action.admin_id,
            user_id: action.user_id,
            verification_request_id: action.verification_request_id,
            action: action.action,
            note: action.note,
            created_at: action.created_at,
            user_email: action.user_id || 'Unknown',
            user_name: userProfile?.full_name || 'Unknown',
            admin_email: action.admin_id || 'Unknown',
            admin_name: adminProfile?.full_name || 'Unknown',
          };
        });

        setAuditLogs(mappedLogs);
        return;
      }

      console.log('[AdminAuditLog] Raw data received:', adminActions?.length || 0, 'records');

      // Fetch all profiles to get admin names (admin_id doesn't have foreign key, so fetch separately)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      const profilesMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Map admin actions to audit log entries
      const mappedLogs: AuditLogEntry[] = (adminActions || []).map((action: any) => {
        const userProfile = profilesMap.get(action.user_id);
        const adminProfile = profilesMap.get(action.admin_id);

        return {
          id: action.id,
          admin_id: action.admin_id,
          user_id: action.user_id,
          verification_request_id: action.verification_request_id,
          action: action.action,
          note: action.note,
          created_at: action.created_at,
          user_email: action.user_id || 'Unknown',
          user_name: action.user_profile?.full_name || userProfile?.full_name || 'Unknown',
          admin_email: action.admin_id || 'Unknown',
          admin_name: adminProfile?.full_name || 'Unknown',
        };
      });

      console.log('[AdminAuditLog] Mapped data:', mappedLogs.length, 'records');
      setAuditLogs(mappedLogs);
    } catch (error: any) {
      console.error('[AdminAuditLog] Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to fetch audit logs",
        variant: "destructive",
      });
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      (log.user_email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.user_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.admin_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Map action to severity for filtering
    const getSeverity = (action: string): string => {
      if (['approved', 'rejected'].includes(action)) return 'high';
      if (['requested_more_info'].includes(action)) return 'medium';
      return 'low';
    };
    
    const matchesSeverity = severityFilter === "all" || getSeverity(log.action) === severityFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesSeverity && matchesAction;
  });

  const getSeverity = (action: string): string => {
    if (['approved', 'rejected'].includes(action)) return 'high';
    if (['requested_more_info'].includes(action)) return 'medium';
    return 'low';
  };

  const getSeverityColor = (action: string) => {
    const severity = getSeverity(action);
    switch (severity) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'rejected':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'requested_more_info':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionDisplayName = (action: string): string => {
    switch (action) {
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'requested_more_info':
        return 'Requested More Info';
      default:
        return action.charAt(0).toUpperCase() + action.slice(1);
    }
  };

  const getResourceType = (action: AuditLogEntry): string => {
    if (action.verification_request_id) {
      return 'Verification Request';
    }
    return 'User Action';
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const formattedData = filteredLogs.map(log => ({
        'ID': log.id,
        'Admin': log.admin_name || log.admin_email || 'Unknown',
        'User': log.user_name || log.user_email || 'Unknown',
        'Action': getActionDisplayName(log.action),
        'Resource': getResourceType(log),
        'Note': log.note || 'N/A',
        'Verification Request ID': log.verification_request_id || 'N/A',
        'Severity': getSeverity(log.action),
        'Created At': new Date(log.created_at).toLocaleString(),
      }));

      if (type === 'excel') {
        const result = exportToExcel(formattedData, 'audit_logs', 'Audit Logs');
        if (result.success) {
          toast({
            title: "Success",
            description: "Audit logs exported to Excel successfully",
          });
        }
      } else {
        const result = await exportToPDF(formattedData, 'audit_logs', 'Audit Log Report');
        if (result.success) {
          toast({
            title: "Success",
            description: "Audit logs exported to PDF successfully",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export audit logs",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Audit Logs</h2>
          <p className="text-muted-foreground">Fetching audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-muted-foreground">
            Track all system activities and admin actions
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            className="border-0 gap-0 rounded-[8px]"
            onClick={() => handleExport('excel')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            className="border-0 gap-0 rounded-[8px]"
            onClick={() => handleExport('pdf')}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"

              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger   className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
>
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="requested_more_info">Requested More Info</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground flex items-center">             

               <Badge variant="outline" className="py-2 px-4 h-10 rounded-[8px] mt-1">
               {filteredLogs.length} of {auditLogs.length} logs
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>
            Recent system activities and admin actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-muted/20 overflow-x-auto">
            <Table className="border-none p-0 rounded-lg bg-white/5">
              <TableHeader>
                <TableRow className="border-b border-muted/20 hover:bg-white/15 bg-white/15 text-white">
                  <TableHead className="text-white">Action</TableHead>
                  <TableHead className="text-white">Admin</TableHead>
                  <TableHead className="text-white">User</TableHead>
                  <TableHead className="text-white">Resource</TableHead>
                  <TableHead className="text-white">Note</TableHead>
                  <TableHead className="text-white">Severity</TableHead>
                  <TableHead className="text-white">Timestamp</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {loading ? 'Loading...' : 'No audit logs found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow className="border-b border-muted/20 hover:bg-white/10" key={log.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getActionIcon(log.action)}
                          <span className="font-medium text-white">{getActionDisplayName(log.action)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-white" title={log.admin_email}>
                            {log.admin_name || log.admin_email || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-white" title={log.user_email}>
                            {log.user_name || log.user_email || 'Unknown'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getResourceType(log)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-white" title={log.note || 'No note'}>
                          {log.note || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getSeverityColor(log.action)}>
                          {getSeverity(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="text-sm text-white">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                          className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                        >
                          <Eye className="h-4 w-4 text-white " />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-[360px] sm:max-w-2xl rounded-md">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-black">ID</label>
                  <p className="text-sm">{selectedLog.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Action</label>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="text-sm font-medium">{getActionDisplayName(selectedLog.action)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Admin</label>
                  <p className="text-sm">{selectedLog.admin_name || selectedLog.admin_email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedLog.admin_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">User</label>
                  <p className="text-sm">{selectedLog.user_name || selectedLog.user_email || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedLog.user_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Resource</label>
                  <p className="text-sm">{getResourceType(selectedLog)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Verification Request ID</label>
                  <p className="text-sm font-mono">{selectedLog.verification_request_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Severity</label>
                  <Badge className={getSeverityColor(selectedLog.action)}>
                    {getSeverity(selectedLog.action)}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Timestamp</label>
                  <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-black">Note</label>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedLog.note || 'No note provided'}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

