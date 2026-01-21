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
    fileUrl: string;      // storage path in Supabase Storage
    status: string;       // e.g. "submitted", "accepted", "rejected"
    filename?: string;    // original filename
    size?: number;        // file size in bytes
    mimeType?: string;    // MIME type
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
      // Upload each file to Supabase Storage first
      const uploadedDocuments: VerificationRequest['documents'] = [];

      for (let index = 0; index < documents.length; index++) {
        const file = documents[index];

        // Defensive validation (UI already restricts)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`${file.name}: File size must be less than 10MB`);
        }

        const safeName = sanitizeFilename(file.name);
        const ext = safeName.includes('.') ? '' : getExtensionFromMime(file.type);
        const finalName = ext && !safeName.endsWith(ext) ? `${safeName}${ext}` : safeName;

        // Store under user-specific folder to match storage RLS policies
        const path = `${user.id}/verification/${Date.now()}_${index}_${finalName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('request-documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || undefined,
          });

        if (uploadError || !uploadData) {
          console.error('Error uploading verification document to storage:', uploadError);
          throw uploadError || new Error('Failed to upload verification document');
        }

        uploadedDocuments.push({
          type: getDocumentType(file.name),
          fileUrl: uploadData.path, // storage path; server/admin can turn into signed URL
          status: 'submitted',
          filename: file.name,
          size: file.size,
          mimeType: file.type,
        });
      }

      const { data, error } = await supabase
        .from('verification_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
          documents: uploadedDocuments,
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

  const sanitizeFilename = (filename: string): string => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  };

  const getExtensionFromMime = (mimeType: string): string => {
    if (!mimeType) return '';
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
    };
    return map[mimeType] || '';
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