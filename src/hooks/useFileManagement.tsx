import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export interface AdminFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  folder_path: string;
  uploaded_by: string;
  uploaded_at: string;
  description?: string;
  tags: string[];
  is_public: boolean;
  status: 'active' | 'archived' | 'deleted';
  download_count: number;
  last_downloaded_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FileFolder {
  id: string;
  name: string;
  path: string;
  parent_path?: string;
  created_at: string;
  updated_at: string;
}

export interface FileAccess {
  id: string;
  file_id: string;
  user_id: string;
  access_type: 'view' | 'download' | 'edit';
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

export const useFileManagement = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [folders, setFolders] = useState<FileFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('');

  // Fetch files for current folder
  const fetchFiles = useCallback(async (folderPath: string = '') => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('admin_files')
        .select('*')
        .eq('folder_path', folderPath)
        .eq('status', 'active')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch folders
  const fetchFolders = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('file_folders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch folders');
    }
  }, [user]);

  // Upload file
  const uploadFile = useCallback(async (
    file: File, 
    folderPath: string = '', 
    description?: string, 
    tags: string[] = [],
    isPublic: boolean = false
  ) => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const uniqueFilename = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `admin-files/${folderPath}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);

      // Insert file record
      const { data, error: insertError } = await supabase
        .from('admin_files')
        .insert({
          filename: uniqueFilename,
          original_filename: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          folder_path: folderPath,
          uploaded_by: user.id,
          description,
          tags,
          is_public: isPublic
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Refresh files list
      await fetchFiles(folderPath);
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload file');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, fetchFiles]);

  // Download file
  const downloadFile = useCallback(async (file: AdminFile) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Check if user has access to this file
      if (!file.is_public && file.uploaded_by !== user.id) {
        const { data: access } = await supabase
          .from('file_access')
          .select('*')
          .eq('file_id', file.id)
          .eq('user_id', user.id)
          .single();

        if (!access) {
          throw new Error('Access denied to this file');
        }
      }

      // Get download URL
      const { data, error } = await supabase.storage
        .from('files')
        .createSignedUrl(file.file_path, 60); // 60 seconds expiry

      if (error) throw error;

      // Update download count
      await supabase
        .from('admin_files')
        .update({
          download_count: file.download_count + 1,
          last_downloaded_at: new Date().toISOString()
        })
        .eq('id', file.id);

      // Trigger download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = file.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file');
      throw err;
    }
  }, [user]);

  // Create folder
  const createFolder = useCallback(async (name: string, parentPath: string = '') => {
    if (!user) throw new Error('User not authenticated');

    try {
      const path = parentPath ? `${parentPath}/${name}` : name;
      
      const { data, error } = await supabase
        .from('file_folders')
        .insert({
          name,
          path,
          parent_path: parentPath || null
        })
        .select()
        .single();

      if (error) throw error;

      await fetchFolders();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
      throw err;
    }
  }, [user, fetchFolders]);

  // Delete file
  const deleteFile = useCallback(async (fileId: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error } = await supabase
        .from('admin_files')
        .update({ status: 'deleted' })
        .eq('id', fileId)
        .eq('uploaded_by', user.id);

      if (error) throw error;

      await fetchFiles(currentFolder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
      throw err;
    }
  }, [user, currentFolder, fetchFiles]);

  // Grant file access
  const grantFileAccess = useCallback(async (
    fileId: string, 
    userId: string, 
    accessType: 'view' | 'download' | 'edit',
    expiresAt?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('file_access')
        .insert({
          file_id: fileId,
          user_id: userId,
          access_type: accessType,
          granted_by: user.id,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to grant file access');
      throw err;
    }
  }, [user]);

  // Get folder breadcrumbs
  const getFolderBreadcrumbs = useCallback((folderPath: string) => {
    if (!folderPath) return [];
    
    const parts = folderPath.split('/').filter(Boolean);
    const breadcrumbs = [];
    
    for (let i = 0; i < parts.length; i++) {
      breadcrumbs.push({
        name: parts[i],
        path: parts.slice(0, i + 1).join('/')
      });
    }
    
    return breadcrumbs;
  }, []);

  // Initialize
  useEffect(() => {
    if (user) {
      fetchFolders();
      fetchFiles(currentFolder);
    }
  }, [user, currentFolder, fetchFolders, fetchFiles]);

  return {
    files,
    folders,
    loading,
    error,
    currentFolder,
    setCurrentFolder,
    uploadFile,
    downloadFile,
    createFolder,
    deleteFile,
    grantFileAccess,
    getFolderBreadcrumbs,
    fetchFiles,
    fetchFolders
  };
};
