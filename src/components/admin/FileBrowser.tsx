import React, { useState } from 'react';
import { 
  Folder, 
  File, 
  Download, 
  Trash2, 
  Eye, 
  MoreVertical,
  ChevronRight,
  Home
} from 'lucide-react';
import { useFileManagement, AdminFile, FileFolder } from '../../hooks/useFileManagement';

interface FileBrowserProps {
  currentFolder: string;
  onFolderClick: (folderPath: string) => void;
  onFileClick: (file: AdminFile) => void;
}

export const FileBrowser: React.FC<FileBrowserProps> = ({
  currentFolder,
  onFolderClick,
  onFileClick
}) => {
  const { files, folders, loading, downloadFile, deleteFile, getFolderBreadcrumbs } = useFileManagement();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const breadcrumbs = getFolderBreadcrumbs(currentFolder);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  const handleDownload = async (file: AdminFile) => {
    try {
      await downloadFile(file);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleDelete = async (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      try {
        await deleteFile(fileId);
        setSelectedFile(null);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }
  };

  const currentFolders = folders.filter(folder => 
    folder.parent_path === currentFolder
  );

  const currentFiles = files.filter(file => 
    file.folder_path === currentFolder
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <button
          onClick={() => onFolderClick('')}
          className="flex items-center gap-1 hover:text-blue-600 transition-colors"
        >
          <Home className="h-4 w-4" />
          Home
        </button>
        
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            <ChevronRight className="h-4 w-4" />
            <button
              onClick={() => onFolderClick(crumb.path)}
              className="hover:text-blue-600 transition-colors"
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Folders */}
        {currentFolders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onFolderClick(folder.path)}
            className="group cursor-pointer p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <Folder className="h-8 w-8 text-blue-500" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-600">
                  {folder.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Folder
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Files */}
        {currentFiles.map((file) => (
          <div
            key={file.id}
            className="group relative p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{getFileIcon(file.mime_type)}</span>
              <div className="flex-1 min-w-0">
                <h3 
                  className="font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600"
                  onClick={() => onFileClick(file)}
                >
                  {file.original_filename}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.file_size)}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(file.uploaded_at)}
                </p>
                {file.download_count > 0 && (
                  <p className="text-xs text-gray-400">
                    Downloaded {file.download_count} times
                  </p>
                )}
              </div>
              
              {/* File Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onFileClick(file)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="View details"
                >
                  <Eye className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  onClick={() => setSelectedFile(selectedFile === file.id ? null : file.id)}
                  className="p-1 hover:bg-gray-200 rounded"
                  title="More options"
                >
                  <MoreVertical className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Dropdown Menu */}
            {selectedFile === file.id && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={() => handleDelete(file.id)}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {currentFolders.length === 0 && currentFiles.length === 0 && (
        <div className="text-center py-12">
          <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No files or folders
          </h3>
          <p className="text-gray-500">
            {currentFolder ? 'This folder is empty.' : 'Start by uploading files or creating folders.'}
          </p>
        </div>
      )}
    </div>
  );
};

