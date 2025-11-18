import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface VerificationRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'more_info_required';
  reason: string | null;
  documents: Array<{
    type: string;
    fileUrl: string;
    status: string;
  }>;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAction {
  id: string;
  admin_id: string;
  user_id: string;
  verification_request_id: string;
  action: 'approved' | 'rejected' | 'requested_more_info';
  note: string | null;
  created_at: string;
}

function useVerification() {
  const { user } = useAuth();
  const { refetchProfile } = useProfile();
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchVerificationRequests();
      fetchAdminActions();
    }
  }, [user]);

  const fetchVerificationRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerificationRequests((data || []) as VerificationRequest[]);
    } catch (error) {
      console.error('Error fetching verification requests:', error);
      toast.error('Failed to load verification requests');
    }
  };

  const fetchAdminActions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('admin_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminActions((data || []) as AdminAction[]);
    } catch (error) {
      console.error('Error fetching admin actions:', error);
    }
  };

  const submitVerification = async (documents: File[]) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    try {
      // Convert files to document objects for storage
      const documentData = documents.map((file, index) => ({
        type: getDocumentType(file.name),
        fileUrl: `temp_${Date.now()}_${index}`, // In real implementation, upload to storage first
        status: 'submitted'
      }));

      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          documents: documentData
        })
        .select()
        .single();

      if (error) throw error;

      // Update user status to pending_verification
      await supabase
        .from('profiles')
        .update({ status: 'pending_verification' })
        .eq('user_id', user.id);

      await fetchVerificationRequests();
      await refetchProfile();
      
      toast.success('Verification documents submitted successfully!');
      return data;
    } catch (error) {
      console.error('Error submitting verification:', error);
      toast.error('Failed to submit verification documents');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getDocumentType = (filename: string): string => {
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.includes('id') || lowerFilename.includes('license') || lowerFilename.includes('passport')) {
      return 'id_document';
    }
    if (lowerFilename.includes('selfie') || lowerFilename.includes('photo')) {
      return 'selfie';
    }
    if (lowerFilename.includes('proof') || lowerFilename.includes('address') || lowerFilename.includes('utility')) {
      return 'proof_of_address';
    }
    return 'other';
  };

  return {
    verificationRequests,
    adminActions,
    loading,
    submitVerification,
    refetchVerificationRequests: fetchVerificationRequests,
    refetchAdminActions: fetchAdminActions,
  };
}

export { useVerification };