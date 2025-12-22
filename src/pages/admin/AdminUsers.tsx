import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  UserPlus,
  Download,
  Mail,
  Calendar,
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  UserX,
  Settings,
  RefreshCw,
  FileText,
  Phone,
  MapPin,
  DollarSign,
  Clock,
  Star,
  Ban,
  Unlock,
  File,
  Check,
  X,
  MessageSquare,
  FileImage,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportToExcel, exportToPDF, formatDataForExport } from "@/utils/exportUtils";

interface User {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  employment_status?: string | null;
  employer?: string | null;
  annual_income?: number | null;
  investment_experience?: string | null;
  risk_tolerance?: string | null;
  investment_goals?: string[] | null;
  documents_uploaded?: boolean | null;
  status: string;
  has_completed_profile: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  role?: string;
  is_verified?: boolean;
  avatar_url?: string | null;
  is_active?: boolean | null;
}

interface AdminAction {
  type: 'approve' | 'reject' | 'suspend' | 'activate' | 'change_role' | 'verify';
  userId: string;
  data?: Record<string, unknown>;
  note?: string;
}

interface VerificationRequest {
  id: string;
  user_id: string;
  documents: Record<string, unknown>;
  status: string;
  reason?: string;
  submitted_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<AdminAction | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [newRole, setNewRole] = useState("");
  const [processing, setProcessing] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    employment_status: "",
    employer: "",
    annual_income: 0,
    investment_experience: "",
    risk_tolerance: "",
    investment_goals: [] as string[],
    status: ""
  });

  // Verification documents state
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [selectedUserForDocs, setSelectedUserForDocs] = useState<User | null>(null);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approve' | 'reject' | 'request_more_info' | null>(null);
  const [verificationNote, setVerificationNote] = useState("");

  // Delete user state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('[FETCH] Starting to fetch users...');
      
      // Fetch profiles and user_roles separately since there's no direct relationship
      const [profilesResponse, userRolesResponse] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('*')
      ]);

      console.log('[FETCH] Profiles response:', { 
        dataCount: profilesResponse.data?.length || 0, 
        error: profilesResponse.error 
      });
      console.log('[FETCH] User roles response:', { 
        dataCount: userRolesResponse.data?.length || 0, 
        error: userRolesResponse.error 
      });

      if (profilesResponse.error) throw profilesResponse.error;
      if (userRolesResponse.error) throw userRolesResponse.error;

      const profiles = profilesResponse.data || [];
      const userRoles = userRolesResponse.data || [];

      console.log(`[FETCH] Total profiles fetched: ${profiles.length}`);
      // Log detailed is_active information
      const profilesWithActiveStatus = profiles.map(p => ({
        user_id: p.user_id,
        is_active: (p as { is_active?: boolean | null }).is_active,
        status: p.status,
        has_is_active_field: 'is_active' in p
      }));
      
      console.log(`[FETCH] Sample profile is_active values:`, profilesWithActiveStatus.slice(0, 5));
      
      // Count how many have is_active = false
      const inactiveCount = profilesWithActiveStatus.filter(p => p.is_active === false).length;
      const nullCount = profilesWithActiveStatus.filter(p => p.is_active === null || p.is_active === undefined).length;
      const activeCount = profilesWithActiveStatus.filter(p => p.is_active === true).length;
      
      console.log(`[FETCH] is_active breakdown: false=${inactiveCount}, null/undefined=${nullCount}, true=${activeCount}`);

      // Filter out inactive users (if is_active field exists and is false)
      const activeProfiles = profiles.filter((profile) => {
        const isActive = (profile as { is_active?: boolean | null }).is_active;
        const shouldInclude = isActive !== false;
        if (!shouldInclude) {
          console.log(`[FETCH] Filtering out inactive user: ${profile.user_id} (is_active: ${isActive}, status: ${profile.status})`);
        }
        return shouldInclude;
      });

      console.log(`[FETCH] Active profiles after filtering: ${activeProfiles.length} (filtered out: ${profiles.length - activeProfiles.length})`);

      // Combine the data
      const usersWithRoles = activeProfiles.map(profile => {
        const userRole = userRoles.find(ur => ur.user_id === profile.user_id);
        
        return {
          ...profile,
          // Prefer an explicit email column on profiles if it exists, otherwise fall back to user_id
          email: (profile as any).email || profile.user_id,
          last_sign_in_at: null, // We can't access this without admin privileges
          role: userRole?.role || 'user',
          is_verified: profile.status === 'verified' // Use profile status as verification indicator
        };
      });

      console.log(`[FETCH] Final users with roles: ${usersWithRoles.length}`);
      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleAdminAction = async (action: AdminAction) => {
    try {
      setProcessing(true);
      
      switch (action.type) {
        case 'approve':
          await updateUserStatus(action.userId, 'verified');
          break;
        case 'reject':
          await updateUserStatus(action.userId, 'rejected');
          break;
        case 'suspend':
          await updateUserStatus(action.userId, 'blocked');
          break;
        case 'activate':
          await updateUserStatus(action.userId, 'verified');
          break;
        case 'change_role':
          if (action.data?.role && typeof action.data.role === 'string') {
            await updateUserRole(action.userId, action.data.role as 'admin' | 'moderator' | 'user');
          }
          break;
        case 'verify':
          await updateUserStatus(action.userId, 'verified');
          break;
      }

      // Log admin action
      await logAdminAction(action);

      toast({
        title: "Success",
        description: `User ${action.type} successful`,
      });

      // Refresh users
      await fetchUsers();
      
    } catch (error) {
      console.error('Error performing admin action:', error);
      toast({
        title: "Error",
        description: `Failed to ${action.type} user`,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      setActionDialogOpen(false);
      setCurrentAction(null);
      setActionNote("");
      setNewRole("");
    }
  };

  const updateUserStatus = async (userId: string, status: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ status })
      .eq('user_id', userId);

    if (error) throw error;
  };

  const updateUserRole = async (userId: string, role: 'admin' | 'moderator' | 'user') => {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role });

    if (error) throw error;
  };

  const logAdminAction = async (action: AdminAction) => {
    const { error } = await supabase
      .from('admin_actions')
      .insert({
        admin_id: user?.id,
        user_id: action.userId,
        action: action.type,
        note: action.note
      });

    if (error) {
        console.error('Error logging admin action:', error);
        throw error;
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      zip_code: user.zip_code || "",
      employment_status: user.employment_status || "",
      employer: user.employer || "",
      annual_income: user.annual_income || 0,
      investment_experience: user.investment_experience || "",
      risk_tolerance: user.risk_tolerance || "",
      investment_goals: user.investment_goals || [],
      status: user.status || ""
    });
    setEditDialogOpen(true);
  };

  const handleViewDocuments = async (user: User) => {
    setSelectedUserForDocs(user);
    setLoadingDocuments(true);
    setDocumentsDialogOpen(true);

    try {
      const { data: requests, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVerificationRequests((requests || []) as VerificationRequest[]);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch verification documents",
        variant: "destructive",
      });
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleVerificationAction = async (action: 'approve' | 'reject' | 'request_more_info', requestId: string) => {
    if (!selectedUserForDocs) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('verification_requests')
        .update({
          status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested_more_info',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          reason: verificationNote || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      // Log admin action
      await logAdminAction({
        type: action === 'approve' ? 'approve' : action === 'reject' ? 'reject' : 'verify',
        userId: selectedUserForDocs.user_id,
        note: `Verification ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested more info'}: ${verificationNote}`
      });

      toast({
        title: "Success",
        description: `Verification ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested more info'} successfully`,
      });

      // Refresh verification requests
      const { data: requests, error: refreshError } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', selectedUserForDocs.user_id)
        .order('created_at', { ascending: false });

      if (!refreshError) {
        setVerificationRequests((requests || []) as VerificationRequest[]);
      }

      setVerificationAction(null);
      setVerificationNote("");
      
    } catch (error) {
      console.error('Error updating verification request:', error);
      toast({
        title: "Error",
        description: "Failed to update verification request",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      setProcessing(true);

      const updateData = {
        full_name: editForm.full_name,
        phone: editForm.phone,
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
        zip_code: editForm.zip_code,
        employment_status: editForm.employment_status,
        employer: editForm.employer,
        annual_income: editForm.annual_income,
        investment_experience: editForm.investment_experience,
        risk_tolerance: editForm.risk_tolerance,
        investment_goals: editForm.investment_goals,
        status: editForm.status,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', editingUser.user_id)
        .select();

      if (error) throw error;

      // Log admin action
      await logAdminAction({
        type: 'approve', // Using 'approve' for profile updates
        userId: editingUser.user_id,
        note: `User profile updated by admin`
      });

      toast({
        title: "Success",
        description: "User profile updated successfully",
      });

      // Refresh users
      await fetchUsers();
      
      // Close dialog
      setEditDialogOpen(false);
      setEditingUser(null);
      
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user profile",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) {
      console.log('[DELETE HANDLER] No user to delete');
      return;
    }

    console.log('[DELETE HANDLER] Starting delete process for:', {
      user_id: userToDelete.user_id,
      full_name: userToDelete.full_name,
      is_bulk: userToDelete.user_id === 'bulk',
      reason: deleteReason
    });

    try {
      setProcessing(true);

      if (userToDelete.user_id === 'bulk') {
        // Handle bulk deletion
        console.log('[DELETE HANDLER] Processing bulk deletion for', selectedUsers.length, 'users');
        const deletedCount = await handleBulkDelete();
        
        console.log('[DELETE HANDLER] Bulk deletion completed. Deleted:', deletedCount);
        toast({
          title: "Success",
          description: `${deletedCount} users deleted successfully`,
        });
      } else {
        // Handle single user deletion
        console.log('[DELETE HANDLER] Processing single user deletion');
        
        // Send deletion email before deleting the user
        // Validate email format (basic check)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (userToDelete.email && emailRegex.test(userToDelete.email)) {
          try {
            console.log('[DELETE HANDLER] Sending account deletion email to:', userToDelete.email);
            const { data: emailData, error: emailError } = await supabase.functions.invoke('send-account-deletion', {
              body: {
                user_email: userToDelete.email,
                user_name: userToDelete.full_name || undefined,
                deletion_reason: deleteReason || undefined,
              },
            });

            if (emailError) {
              console.warn('[DELETE HANDLER] Failed to send deletion email:', emailError);
              // Don't block deletion if email fails
            } else {
              console.log('[DELETE HANDLER] Account deletion email sent successfully');
            }
          } catch (emailErr: any) {
            console.warn('[DELETE HANDLER] Error sending deletion email:', emailErr);
            // Don't block deletion if email fails
          }
        } else {
          console.warn('[DELETE HANDLER] No valid email address available for user, skipping email notification. Email:', userToDelete.email);
        }
        
        await deleteSingleUser(userToDelete.user_id);
        
        console.log('[DELETE HANDLER] Single user deletion completed');
        toast({
          title: "Success",
          description: "User deleted successfully from all accessible tables",
        });
      }

      // Refresh users
      console.log('[DELETE HANDLER] Refreshing users list...');
      await fetchUsers();
      console.log('[DELETE HANDLER] Users list refreshed');
      
      // Close dialog
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      setDeleteReason("");
      
    } catch (error) {
      console.error('[DELETE HANDLER] Error deleting user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
      console.log('[DELETE HANDLER] Delete process completed');
    }
  };

  const deleteSingleUser = async (userId: string) => {
    try {
      // Soft delete: Update profile to inactive and blocked status instead of hard delete
      console.log(`[DELETE] Starting soft delete for user: ${userId}`);
      console.log(`[DELETE] Update payload:`, {
        is_active: false,
        status: 'blocked',
        updated_at: new Date().toISOString()
      });
      
      const { data: updateData, error: profileError } = await supabase
        .from('profiles')
        .update({
          is_active: false,
          status: 'blocked',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select();

      console.log(`[DELETE] Update response:`, { 
        data: updateData, 
        error: profileError,
        dataLength: updateData?.length || 0,
        errorCode: profileError?.code,
        errorMessage: profileError?.message,
        errorDetails: profileError?.details,
        errorHint: profileError?.hint
      });

      if (profileError) {
        console.error('[DELETE] Error updating profile:', profileError);
        
        // Check if error is due to missing column
        if (profileError.message?.includes('column') && profileError.message?.includes('does not exist')) {
          throw new Error(`Database column missing. Please run migration to add is_active column to profiles table. Error: ${profileError.message}`);
        }
        
        throw new Error(`Failed to delete profile: ${profileError.message}`);
      }

      if (!updateData || updateData.length === 0) {
        console.warn(`[DELETE] No rows updated for user ${userId}. User may not exist or RLS policy may be blocking the update.`);
        console.warn(`[DELETE] Attempting to verify user exists...`);
        
        // Verify user exists
        const { data: checkData, error: checkError } = await supabase
          .from('profiles')
          .select('user_id, status, is_active')
          .eq('user_id', userId)
          .maybeSingle();
          
        console.log(`[DELETE] User verification:`, { checkData, checkError });
      } else {
        console.log(`[DELETE] Successfully updated ${updateData.length} profile record(s) for user ${userId}`);
        console.log(`[DELETE] Updated record:`, updateData[0]);
      }

      // Delete from user_roles table
      console.log(`[DELETE] Deleting user_roles for user ${userId}...`);
      const { data: deletedRoles, error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .select();

      if (roleError) {
        console.error('[DELETE] Error deleting user role:', roleError);
        // Don't throw here as this is not critical
      } else {
        console.log(`[DELETE] Deleted ${deletedRoles?.length || 0} user_roles record(s)`);
      }

      // Delete from referrals table
      console.log(`[DELETE] Deleting referrals for user ${userId}...`);
      const { data: deletedReferrals, error: referralError } = await supabase
        .from('referrals')
        .delete()
        .eq('user_id', userId)
        .select();

      if (referralError) {
        console.error('[DELETE] Error deleting referrals:', referralError);
        // Don't throw here as this is not critical
      } else {
        console.log(`[DELETE] Deleted ${deletedReferrals?.length || 0} referrals record(s)`);
      }

      // Delete from referral_signups where user is referred
      console.log(`[DELETE] Deleting referral_signups for user ${userId}...`);
      const { data: deletedSignups, error: signupError } = await supabase
        .from('referral_signups')
        .delete()
        .eq('referred_user_id', userId)
        .select();

      if (signupError) {
        console.error('[DELETE] Error deleting referral signups:', signupError);
        // Don't throw here as this is not critical
      } else {
        console.log(`[DELETE] Deleted ${deletedSignups?.length || 0} referral_signups record(s)`);
      }

      // Log admin action
      console.log(`[DELETE] Logging admin action for user ${userId}...`);
      try {
        await logAdminAction({
          type: 'suspend', // Using 'suspend' for deletions
          userId: userId,
          note: `User deleted from database. Reason: ${deleteReason || 'No reason provided'}`
        });
        console.log(`[DELETE] Admin action logged successfully`);
      } catch (logError) {
        console.error('[DELETE] Error logging admin action:', logError);
        // Don't throw here as this is not critical
      }

      console.log(`[DELETE] Successfully soft-deleted user ${userId} from all accessible tables`);
    } catch (error) {
      console.error('Error in deleteSingleUser:', error);
      throw error;
    }
  };

  const handleBulkDelete = async (): Promise<number> => {
    let deletedCount = 0;

    for (const userId of selectedUsers) {
      try {
        await deleteSingleUser(userId);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting user ${userId}:`, error);
      }
    }

    setSelectedUsers([]);
    return deletedCount;
  };

  const handleBulkAction = async (action: 'approve' | 'reject' | 'suspend' | 'change_role' | 'delete') => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Warning",
        description: "Please select users first",
        variant: "destructive",
      });
      return;
    }

    if (action === 'delete') {
      // For bulk delete, we'll show a confirmation dialog
      setUserToDelete({ user_id: 'bulk', full_name: `${selectedUsers.length} users` } as User);
      setDeleteReason("Bulk deletion by admin");
      setDeleteDialogOpen(true);
      return;
    }

    try {
      setProcessing(true);

      for (const userId of selectedUsers) {
        const adminAction: AdminAction = {
          type: action,
          userId,
          data: action === 'change_role' ? { role: newRole } : undefined
        };
        await handleAdminAction(adminAction);
      }

      setSelectedUsers([]);
      toast({
        title: "Success",
        description: `Bulk ${action} completed for ${selectedUsers.length} users`,
      });

    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
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

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Admin</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Moderator</Badge>;
      default:
        return <Badge variant="outline" className="text-white">User</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="bg-green-100 text-green-800">Verified</Badge>;
      case 'pending_verification':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'blocked':
        return <Badge variant="destructive" className="bg-gray-100 text-gray-800">Blocked</Badge>;
      default:
        return <Badge variant="outline" className="text-white">Unverified</Badge>;
    }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const formattedData = formatDataForExport(users, 'users');
      
      if (type === 'excel') {
        const result = exportToExcel(formattedData, 'users_report', 'Users');
        if (result.success) {
          toast({
            title: "Success",
            description: "Users exported to Excel successfully",
          });
        }
      } else {
        const result = await exportToPDF(formattedData, 'users_report', 'Users Report');
        if (result.success) {
          toast({
            title: "Success",
            description: "Users exported to PDF successfully",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export users",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(filteredUsers.map(user => user.user_id));
  };

  const clearSelection = () => {
    setSelectedUsers([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2 text-white pt-5">Loading Users</h2>
          <p className="text-muted-foreground">Fetching user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground text-white">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user accounts, roles, and verification status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="rounded-[8px] hover:bg-white/80 border-0"
            size="sm"
            onClick={() => handleExport('excel')}
            disabled={processing}
          >
            <Download className="h-4 w-4 mr-0" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[8px] hover:bg-white/80 border-0"
            onClick={() => handleExport('pdf')}
            disabled={processing}
          >
            <Download className="h-4 w-4 mr-0" />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-[8px] hover:bg-white/80 border-0"
            onClick={fetchUsers}
            disabled={processing}
          >
            <RefreshCw className="h-4 w-4 mr-0" />
            <span className="hidden sm:inline ml-0">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <CardTitle>Filters & Search</CardTitle>
          <CardDescription>
            Search and filter users by various criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-[8px] border-0 shadow-none mt-1 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending_verification">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-center sm:justify-start">
              <Badge variant="outline" className="p-2 px-4 text-white h-10 mt-1 rounded-[8px] shadow-none">
                {filteredUsers.length} users
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

                {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-white">
                      {selectedUsers.length} user(s) selected
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[8px] hover:bg-white/80 border-0"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={newRole} onValueChange={setNewRole}>
                      <SelectTrigger className="w-32 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[36px]" style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      className="rounded-[8px] border-0 hover:bg-primary/80"
                      onClick={() => handleBulkAction('approve')}
                      disabled={processing}
                    >
                      <CheckCircle className="h-4 w-4 mr-0" />
                      <span className="hidden sm:inline">Approve</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[8px] border-0 hover:bg-white/80"
                      onClick={() => handleBulkAction('reject')}
                      disabled={processing}
                    >
                      <XCircle className="h-4 w-4 mr-0" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-[8px] border-0 hover:bg-white/80"
                      onClick={() => handleBulkAction('suspend')}
                      disabled={processing}
                    >
                      <Ban className="h-4 w-4 mr-0" />
                      <span className="hidden sm:inline">Suspend</span>
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="rounded-[8px] border-0 hover:bg-red-600/80"
                      onClick={() => handleBulkAction('delete')}
                      disabled={processing}
                    >
                      <Trash2 className="h-4 w-4 mr-0" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                    {newRole && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="rounded-[8px] border-0 hover:bg-white/80"
                        onClick={() => handleBulkAction('change_role')}
                        disabled={processing}
                      >
                        <Settings className="h-4 w-4 mr-0" />
                        <span className="hidden sm:inline">Change Role</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

      {/* Users List */}
      <Card className="border border-muted/20 p-0 rounded-lg bg-white/5">
        <CardHeader>
          <div className="block sm:flex items-center justify-between mb-2 sm:mb-0">
            <div className="pb-4 sm:pb-0">
              <CardTitle className="mb-1 sm:mb-0">Users</CardTitle>
              <CardDescription>
                All registered users in the system
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-[8px] hover:bg-white/80 border-0"
                onClick={selectAllUsers}
              >
                Select All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div key={user.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-muted/20 rounded-lg gap-4">
                  <div className="flex items-center space-x-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.user_id)}
                      onCheckedChange={() => toggleUserSelection(user.user_id)}
                    />
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-medium truncate text-white">{user.full_name || 'No name'}</p>
                        {getRoleBadge(user.role || 'user')}
                        {getStatusBadge(user.status)}
                        {user.is_verified && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-1 truncate">
                        ID: {user.user_id}
                      </p>
                      <p className="text-sm text-muted-foreground mb-1 truncate">
                        Email: {user.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>Joined: {formatDate(user.created_at)}</span>
                        {user.phone && (
                          <span>Phone: {user.phone}</span>
                        )}
                        {user.has_completed_profile && (
                          <Badge variant="outline" className="text-xs text-white">
                            Profile Complete
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex gap-1 items-center">
                      <Button
                        variant={user.role === "user" || !user.role ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCurrentAction({
                            type: 'change_role',
                            userId: user.user_id,
                            data: { role: 'user' }
                          });
                          setActionDialogOpen(true);
                        }}
                        className="rounded-[8px] border-0 h-[36px] px-2 text-xs"
                      >
                        User
                      </Button>
                      <Button
                        variant={user.role === "moderator" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCurrentAction({
                            type: 'change_role',
                            userId: user.user_id,
                            data: { role: 'moderator' }
                          });
                          setActionDialogOpen(true);
                        }}
                        className="rounded-[8px] border-0 h-[36px] px-2 text-xs"
                      >
                        Moderator
                      </Button>
                      <Button
                        variant={user.role === "admin" ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCurrentAction({
                            type: 'change_role',
                            userId: user.user_id,
                            data: { role: 'admin' }
                          });
                          setActionDialogOpen(true);
                        }}
                        className="rounded-[8px] border-0 h-[36px] px-2 text-xs"
                      >
                        Admin
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => {
                        setSelectedUser(user);
                        setUserDetailsOpen(true);
                      }}
                       className="text-white bg-muted/20 hover:text-white hover:bg-muted/40 rounded-[8px]"
                    >
                      <Eye className="h-4 w-4 text-white" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => {
                        setCurrentAction({
                          type: user.status === 'verified' ? 'suspend' : 'approve',
                          userId: user.user_id
                        });
                        setActionDialogOpen(true);
                      }}
                       className="text-white bg-green-600 hover:text-white hover:bg-green-700 rounded-[8px]"
                    >
                      {user.status === 'verified' ? (
                        <Ban className="h-4 w-4 text-white" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm" 
                      onClick={() => {
                        setUserToDelete(user);
                        setDeleteDialogOpen(true);
                      }}
                      className="text-white bg-red-600 hover:text-white hover:bg-red-700 rounded-[8px]"
                    >
                      <Trash2 className="h-4 w-4 " />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">No users found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Details Dialog */}
      <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
        <DialogContent className="sm:max-w-xl sm:w-full w-[300px]">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about the selected user
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedUser.full_name || 'No name provided'}</p>
                  <p className="text-sm text-muted-foreground">ID: {selectedUser.user_id}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">User ID: {selectedUser.user_id}</span>
                  </div>
                  {selectedUser.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Joined: {formatDate(selectedUser.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Role: {selectedUser.role || 'user'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {selectedUser.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedUser.address}</span>
                    </div>
                  )}
                  {selectedUser.annual_income && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Income: ${selectedUser.annual_income.toLocaleString()}</span>
                    </div>
                  )}
                  {selectedUser.employment_status && (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Employment: {selectedUser.employment_status}</span>
                    </div>
                  )}
                  {selectedUser.investment_experience && (
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Experience: {selectedUser.investment_experience}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="block items-center justify-between pt-4">
                <div className="flex items-center flex-wrap sm:gap-0 gap-2 space-x-2 mb-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-0 w-full sm:w-auto rounded-[8px] border-0 hover:bg-white/10"
                    onClick={() => {
                      handleEditUser(selectedUser);
                      setUserDetailsOpen(false);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="gap-0 sm:w-auto rounded-[8px] border-0 hover:bg-white/10"
                    onClick={() => {
                      handleViewDocuments(selectedUser);
                      setUserDetailsOpen(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Documents
                  </Button>
                </div>
                <div className="flex flex-wrap sm:gap-0 gap-2 items-center space-x-2">
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      setUserToDelete(selectedUser);
                      setUserDetailsOpen(false);
                      setDeleteDialogOpen(true);
                    }}
                    className="gap-0 w-full sm:w-auto rounded-[8px] border-0 hover:bg-red-600/80"
                  >
                    <Trash2 className="h-4 w-4 sm:mr-2" />
                    Delete User
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      setCurrentAction({
                        type: 'suspend',
                        userId: selectedUser.user_id
                      });
                      setActionDialogOpen(true);
                      setUserDetailsOpen(false);
                    }}
                    className="gap-0 w-full sm:w-auto rounded-[8px] border-0 hover:bg-red-600/80"
                  >
                    <Ban className="h-4 w-4 sm:mr-2" />
                    Suspend
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentAction({
                        type: 'approve',
                        userId: selectedUser.user_id
                      });
                      setActionDialogOpen(true);
                      setUserDetailsOpen(false);
                    }}
                    className="gap-0 w-full sm:w-auto rounded-[8px] border-0 hover:bg-white/80"
                  >
                    <CheckCircle className="h-4 w-4 sm:mr-2" />
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentAction?.type === 'approve' && 'Approve User'}
              {currentAction?.type === 'reject' && 'Reject User'}
              {currentAction?.type === 'suspend' && 'Suspend User'}
              {currentAction?.type === 'activate' && 'Activate User'}
              {currentAction?.type === 'change_role' && 'Change User Role'}
              {currentAction?.type === 'verify' && 'Verify User'}
            </DialogTitle>
            <DialogDescription>
              Confirm the action you want to perform on this user
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {currentAction?.type === 'approve' && 'This will approve the user and grant them access to the platform.'}
                {currentAction?.type === 'reject' && 'This will reject the user and prevent them from accessing the platform.'}
                {currentAction?.type === 'suspend' && 'This will suspend the user temporarily.'}
                {currentAction?.type === 'activate' && 'This will reactivate the user account.'}
                {currentAction?.type === 'change_role' && 'This will change the user\'s role and permissions. Are you sure you want to proceed?'}
                {currentAction?.type === 'verify' && 'This will verify the user account.'}
              </p>
            </div>
            
            {currentAction?.type === 'change_role' && currentAction.data?.role && typeof currentAction.data.role === 'string' && (
              <div className="p-4 bg-muted/20 rounded-lg border border-muted/40">
                <p className="text-sm text-muted-foreground mb-2">Changing role to:</p>
                <p className="text-xl font-semibold text-white capitalize">{currentAction.data.role}</p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Note (Optional)</label>
              <Textarea
                placeholder="Add a note about this action..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                rows={3}
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
                                    style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] border-0 hover:bg-white/80"
              onClick={() => setActionDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
            className="rounded-[8px] border-0 hover:bg-primary/80"
              onClick={() => {
                if (currentAction) {
                  const actionWithNote = {
                    ...currentAction,
                    note: actionNote
                  };
                  handleAdminAction(actionWithNote);
                }
              }}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Modify user information and account settings
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Editing: {editingUser.full_name || 'No name provided'}</p>
                  <p className="text-sm text-muted-foreground">ID: {editingUser.user_id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      placeholder="Enter full name"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <Input
                      value={editForm.phone}
                      onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Enter phone number"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={editForm.address}
                      onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter address"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">City</label>
                      <Input
                        value={editForm.city}
                        onChange={(e) => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="Enter city"
                        className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                            style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">State</label>
                      <Input
                        value={editForm.state}
                        onChange={(e) => setEditForm(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="Enter state"
                        className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                            style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">ZIP Code</label>
                    <Input
                      value={editForm.zip_code}
                      onChange={(e) => setEditForm(prev => ({ ...prev, zip_code: e.target.value }))}
                      placeholder="Enter ZIP code"
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>
                </div>

                {/* Employment & Financial Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Employment & Financial</h3>
                  
                  <div>
                    <label className="text-sm font-medium">Employment Status</label>
                    <Select 
                      value={editForm.employment_status} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, employment_status: value }))}
                    >
                      <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                        <SelectValue placeholder="Select employment status" />
                      </SelectTrigger>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                        <SelectItem value="employed">Employed</SelectItem>
                        <SelectItem value="unemployed">Unemployed</SelectItem>
                        <SelectItem value="self-employed">Self-Employed</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="retired">Retired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Employer</label>
                    <Input
                      value={editForm.employer}
                      onChange={(e) => setEditForm(prev => ({ ...prev, employer: e.target.value }))}
                      placeholder="Enter employer name"
                       className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Annual Income</label>
                    <Input
                      type="number"
                      value={editForm.annual_income}
                      onChange={(e) => setEditForm(prev => ({ ...prev, annual_income: parseInt(e.target.value) || 0 }))}
                      placeholder="Enter annual income"
                       className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none"
                                          style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">Investment Experience</label>
                    <Select 
                      value={editForm.investment_experience} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, investment_experience: value }))}
                    >
                      <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="some">Some Experience</SelectItem>
                        <SelectItem value="experienced">Experienced</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Risk Tolerance</label>
                    <Select 
                      value={editForm.risk_tolerance} 
                      onValueChange={(value) => setEditForm(prev => ({ ...prev, risk_tolerance: value }))}
                    >
                      <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                        <SelectValue placeholder="Select risk tolerance" />
                      </SelectTrigger>
                      <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                        <SelectItem value="conservative">Conservative</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Investment Goals */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Investment Goals</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    'Retirement Planning',
                    'Income Generation',
                    'Capital Growth',
                    'Tax Benefits',
                    'Diversification',
                    'Wealth Preservation',
                    'Education Funding',
                    'Real Estate Investment'
                  ].map((goal) => (
                    <div key={goal} className="flex items-center space-x-2">
                      <Checkbox
                        checked={editForm.investment_goals.includes(goal)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setEditForm(prev => ({
                              ...prev,
                              investment_goals: [...prev.investment_goals, goal]
                            }));
                          } else {
                            setEditForm(prev => ({
                              ...prev,
                              investment_goals: prev.investment_goals.filter(g => g !== goal)
                            }));
                          }
                        }}
                      />
                      <label className="text-sm">{goal}</label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Account Status</h3>
                <div>
                  <label className="text-sm font-medium">Account Status</label>
                  <Select 
                    value={editForm.status} 
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className='rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400' style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }>
                      <SelectValue placeholder="Select account status" />
                    </SelectTrigger>
                    <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                      <SelectItem value="unverified">Unverified</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-[8px] border-0 hover:bg-white/80"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingUser(null);
                  }}
                  disabled={processing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveUser}
                  className="rounded-[8px] border-0 hover:bg-primary/80"
                  disabled={processing}
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
                  Save Changes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Documents Dialog */}
      <Dialog open={documentsDialogOpen} onOpenChange={setDocumentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Documents</DialogTitle>
            <DialogDescription>
              View and manage verification documents for {selectedUserForDocs?.full_name || selectedUserForDocs?.email}
            </DialogDescription>
          </DialogHeader>

          {loadingDocuments ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading documents...</span>
            </div>
          ) : verificationRequests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">No verification documents found for this user.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {verificationRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">Verification Request</h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted: {new Date(request.submitted_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={
                            request.status === 'approved' ? 'default' :
                            request.status === 'rejected' ? 'destructive' :
                            request.status === 'requested_more_info' ? 'secondary' : 'outline'
                          }
                        >
                          {request.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {request.reason && (
                          <span className="text-sm text-muted-foreground">
                            Reason: {request.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-[8px] border-0"
                          onClick={() => setVerificationAction('request_more_info')}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Request More Info
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-[8px] border-0"
                          onClick={() => setVerificationAction('reject')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-[8px] border-0"
                          onClick={() => setVerificationAction('approve')}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Documents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(request.documents || {}).map(([docType, doc]: [string, Record<string, unknown>]) => (
                      <div key={docType} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm capitalize">
                            {docType.replace('_', ' ')}
                          </h4>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const url = doc.url as string;
                              if (url) window.open(url, '_blank');
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <File className="h-4 w-4" />
                            <span className="truncate">{doc.filename as string}</span>
                          </div>
                          
                          {doc.type && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileImage className="h-4 w-4" />
                              <span>{doc.type as string}</span>
                            </div>
                          )}
                          
                          {doc.size && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <FileText className="h-4 w-4" />
                              <span>{((doc.size as number) / 1024 / 1024).toFixed(2)} MB</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Verification Action Dialog */}
          {verificationAction && (
            <div className="mt-6 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-semibold mb-3">
                {verificationAction === 'approve' && 'Approve Verification'}
                {verificationAction === 'reject' && 'Reject Verification'}
                {verificationAction === 'request_more_info' && 'Request More Information'}
              </h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Note (Optional)</label>
                  <Textarea
                    placeholder="Add a note about this action..."
                    value={verificationNote}
                    onChange={(e) => setVerificationNote(e.target.value)}
                    rows={3}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
                                        style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[8px] border-0"
                    onClick={() => {
                      setVerificationAction(null);
                      setVerificationNote("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-[8px] border-0"
                    variant={
                      verificationAction === 'approve' ? 'default' :
                      verificationAction === 'reject' ? 'destructive' : 'secondary'
                    }
                    onClick={() => {
                      const requestId = verificationRequests[0]?.id;
                      if (requestId) {
                        handleVerificationAction(verificationAction, requestId);
                      }
                    }}
                    disabled={processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      verificationAction === 'approve' ? <Check className="h-4 w-4 mr-1" /> :
                      verificationAction === 'reject' ? <X className="h-4 w-4 mr-1" /> :
                      <MessageSquare className="h-4 w-4 mr-1" />
                    )}
                    {verificationAction === 'approve' && 'Approve'}
                    {verificationAction === 'reject' && 'Reject'}
                    {verificationAction === 'request_more_info' && 'Request More Info'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          {userToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-red-900">
                      {userToDelete.full_name || 'No name provided'}
                    </p>
                    <p className="text-sm text-red-700">ID: {userToDelete.user_id}</p>
                    <p className="text-sm text-red-700">Role: {userToDelete.role || 'user'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for deletion (Optional)</label>
                <Textarea
                  placeholder="Enter reason for deleting this user..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                  className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
                                      style={ { "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none", } as React.CSSProperties }
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Warning:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>This will delete the user from all accessible database tables</li>
                      <li>All user data will be permanently removed</li>
                      <li>Associated referrals and signups will be deleted</li>
                      <li>Note: Some auth system deletions may require admin privileges</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-[8px] border-0 hover:bg-white/80"
              onClick={() => {
                setDeleteDialogOpen(false);
                setUserToDelete(null);
                setDeleteReason("");
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-[8px] border-0 hover:bg-red-700"
              onClick={handleDeleteUser}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
