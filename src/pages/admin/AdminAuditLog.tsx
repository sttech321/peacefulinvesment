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

interface AuditLogEntry {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  resource: string;
  resource_id: string;
  details: string;
  ip_address: string;
  user_agent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export default function AdminAuditLog() {
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
  }, []);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      // Generate mock audit log data for demonstration
      const mockAuditLogs: AuditLogEntry[] = [
        {
          id: "1",
          user_id: "ce8d28ea-22a3-4299-9aab-a7e6920cbcef",
          user_email: "dr.yousuf.mesalm@gmail.com",
          action: "LOGIN",
          resource: "auth",
          resource_id: "auth",
          details: "User logged in successfully",
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          severity: "low",
          created_at: new Date().toISOString(),
        },
        {
          id: "2",
          user_id: "ce8d28ea-22a3-4299-9aab-a7e6920cbcef",
          user_email: "dr.yousuf.mesalm@gmail.com",
          action: "CREATE",
          resource: "user_role",
          resource_id: "admin_role",
          details: "Admin role assigned to user",
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          severity: "high",
          created_at: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "3",
          user_id: "4b468628-ce7a-45f4-b9c7-315bedf7911c",
          user_email: "dev@autoticks.com",
          action: "UPDATE",
          resource: "profile",
          resource_id: "profile_123",
          details: "User profile updated",
          ip_address: "192.168.1.101",
          user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          severity: "medium",
          created_at: new Date(Date.now() - 7200000).toISOString(),
        },
        {
          id: "4",
          user_id: "ce8d28ea-22a3-4299-9aab-a7e6920cbcef",
          user_email: "dr.yousuf.mesalm@gmail.com",
          action: "DELETE",
          resource: "contact_request",
          resource_id: "request_456",
          details: "Contact request deleted",
          ip_address: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          severity: "medium",
          created_at: new Date(Date.now() - 10800000).toISOString(),
        },
        {
          id: "5",
          user_id: "unknown",
          user_email: "unknown@example.com",
          action: "FAILED_LOGIN",
          resource: "auth",
          resource_id: "auth",
          details: "Failed login attempt with invalid credentials",
          ip_address: "192.168.1.102",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          severity: "critical",
          created_at: new Date(Date.now() - 14400000).toISOString(),
        },
      ];

      setAuditLogs(mockAuditLogs);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = severityFilter === "all" || log.severity === severityFilter;
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    
    return matchesSearch && matchesSeverity && matchesAction;
  });

  const getSeverityColor = (severity: string) => {
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
      case 'LOGIN':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'CREATE':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'UPDATE':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'DELETE':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'FAILED_LOGIN':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const formattedData = filteredLogs.map(log => ({
        'ID': log.id,
        'User Email': log.user_email,
        'Action': log.action,
        'Resource': log.resource,
        'Details': log.details,
        'IP Address': log.ip_address,
        'Severity': log.severity,
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
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="CREATE">Create</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="FAILED_LOGIN">Failed Login</SelectItem>
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
                  <TableHead className="text-white">User</TableHead>
                  <TableHead className="text-white">Resource</TableHead>
                  <TableHead className="text-white">Details</TableHead>
                  <TableHead className="text-white">Severity</TableHead>
                  <TableHead className="text-white">IP Address</TableHead>
                  <TableHead className="text-white">Timestamp</TableHead>
                  <TableHead className="text-white">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow className="border-b border-muted/20 hover:bg-white/10" key={log.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getActionIcon(log.action)}
                        <span className="font-medium text-white">{log.action}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-white">{log.user_email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.resource}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-white" title={log.details}>
                        {log.details}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityColor(log.severity)}>
                        {log.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.ip_address}
                      </code>
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
                ))}
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
                  <label className="text-sm font-medium text-black">User Email</label>
                  <p className="text-sm">{selectedLog.user_email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Action</label>
                  <div className="flex items-center space-x-2">
                    {getActionIcon(selectedLog.action)}
                    <span className="text-sm font-medium">{selectedLog.action}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-white">Resource</label>
                  <p className="text-sm">{selectedLog.resource}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Resource ID</label>
                  <p className="text-sm">{selectedLog.resource_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Severity</label>
                  <Badge className={getSeverityColor(selectedLog.severity)}>
                    {selectedLog.severity}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">IP Address</label>
                  <p className="text-sm font-mono">{selectedLog.ip_address}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-black">Timestamp</label>
                  <p className="text-sm">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-black">Details</label>
                <p className="text-sm bg-muted p-3 rounded-md">{selectedLog.details}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-black">User Agent</label>
                <p className="text-sm bg-muted p-3 rounded-md font-mono">
                  {selectedLog.user_agent}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
