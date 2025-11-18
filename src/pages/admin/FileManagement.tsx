import React, { useState } from 'react';
import { 
  Upload, 
  FolderPlus, 
  Search, 
  Filter,
  Grid,
  List,
  Plus
} from 'lucide-react';
import { FileUpload } from '../../components/admin/FileUpload';
import { FileBrowser } from '../../components/admin/FileBrowser';
import { useFileManagement, AdminFile } from '../../hooks/useFileManagement';

export const FileManagement: React.FC = () => {
  const { 
    currentFolder, 
    setCurrentFolder, 
    createFolder, 
    loading 
  } = useFileManagement();
  
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFile, setSelectedFile] = useState<AdminFile | null>(null);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      await createFolder(newFolderName.trim(), currentFolder);
      setNewFolderName('');
      setShowCreateFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleFolderClick = (folderPath: string) => {
    setCurrentFolder(folderPath);
  };

  const handleFileClick = (file: AdminFile) => {
    setSelectedFile(file);
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">File Management</h1>
          <p className="text-gray-600">
            Manage and organize files for users and companies
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateFolder(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <FolderPlus className="h-4 w-4" />
            New Folder
          </button>
          
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Files
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
          <Filter className="h-4 w-4" />
          Filter
        </button>
        
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Current Path Display */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h2 className="text-sm font-medium text-gray-700 mb-1">Current Location</h2>
        <p className="text-lg text-gray-900">
          {currentFolder ? currentFolder : 'Root Directory'}
        </p>
      </div>

      {/* File Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Upload Files</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <FileUpload 
              currentFolder={currentFolder}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Folder</h2>
              <button
                onClick={() => setShowCreateFolder(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCreateFolder}
                  disabled={loading || !newFolderName.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Folder'}
                </button>
                <button
                  onClick={() => setShowCreateFolder(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">File Details</h2>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <span className="text-4xl">
                  {selectedFile.mime_type.startsWith('image/') ? '🖼️' : 
                   selectedFile.mime_type.includes('pdf') ? '📄' : 
                   selectedFile.mime_type.includes('word') ? '📝' : 
                   selectedFile.mime_type.includes('excel') ? '📊' : '📄'}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedFile.original_filename}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedFile.mime_type}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">File Size:</span>
                  <p className="text-gray-900">
                    {Math.round(selectedFile.file_size / 1024)} KB
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Uploaded:</span>
                  <p className="text-gray-900">
                    {new Date(selectedFile.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Downloads:</span>
                  <p className="text-gray-900">{selectedFile.download_count}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <p className="text-gray-900 capitalize">{selectedFile.status}</p>
                </div>
              </div>
              
              {selectedFile.description && (
                <div>
                  <span className="font-medium text-gray-700">Description:</span>
                  <p className="text-gray-900 mt-1">{selectedFile.description}</p>
                </div>
              )}
              
              {selectedFile.tags && selectedFile.tags.length > 0 && (
                <div>
                  <span className="font-medium text-gray-700">Tags:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedFile.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    // Handle download
                    setSelectedFile(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Upload className="h-4 w-4" />
                  Download
                </button>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Browser */}
      <div className="bg-white rounded-lg border border-gray-200">
        <FileBrowser
          currentFolder={currentFolder}
          onFolderClick={handleFolderClick}
          onFileClick={handleFileClick}
        />
      </div>
    </div>
  );
};

