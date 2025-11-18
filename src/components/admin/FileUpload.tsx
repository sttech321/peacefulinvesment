import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Folder, File, X, Plus, Tag } from 'lucide-react';
import { useFileManagement } from '../../hooks/useFileManagement';

interface FileUploadProps {
  currentFolder: string;
  onUploadComplete?: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  currentFolder, 
  onUploadComplete 
}) => {
  const { uploadFile, loading } = useFileManagement();
  const [files, setFiles] = useState<File[]>([]);
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [isPublic, setIsPublic] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    acceptedFiles.forEach(file => {
      setDescriptions(prev => ({ ...prev, [file.name]: '' }));
      setTags(prev => ({ ...prev, [file.name]: [] }));
      setIsPublic(prev => ({ ...prev, [file.name]: false }));
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/plain': ['.txt'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar']
    }
  });

  const removeFile = (fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setDescriptions(prev => {
      const newDesc = { ...prev };
      delete newDesc[fileName];
      return newDesc;
    });
    setTags(prev => {
      const newTags = { ...prev };
      delete newTags[fileName];
      return newTags;
    });
    setIsPublic(prev => {
      const newPublic = { ...prev };
      delete newPublic[fileName];
      return newPublic;
    });
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const updateDescription = (fileName: string, description: string) => {
    setDescriptions(prev => ({ ...prev, [fileName]: description }));
  };

  const updateTags = (fileName: string, tagString: string) => {
    const tagArray = tagString.split(',').map(tag => tag.trim()).filter(Boolean);
    setTags(prev => ({ ...prev, [fileName]: tagArray }));
  };

  const togglePublic = (fileName: string) => {
    setIsPublic(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    const uploadPromises = files.map(async (file) => {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));
        
        await uploadFile(
          file,
          currentFolder,
          descriptions[file.name] || undefined,
          tags[file.name] || [],
          isPublic[file.name] || false
        );

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        return { success: true, file: file.name };
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        return { success: false, file: file.name, error };
      }
    });

    const results = await Promise.all(uploadPromises);
    const failedUploads = results.filter(r => !r.success);
    
    if (failedUploads.length === 0) {
      setFiles([]);
      setDescriptions({});
      setTags({});
      setIsPublic({});
      setUploadProgress({});
      onUploadComplete?.();
    } else {
      alert(`Failed to upload: ${failedUploads.map(f => f.file).join(', ')}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  return (
    <div className="space-y-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-lg text-gray-600 mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-gray-500">
              Supports PDF, Word, Excel, images, and archives
            </p>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Files to Upload ({files.length})</h3>
            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload All Files
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {files.map((file) => (
              <div
                key={file.name}
                className="border rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div>
                      <h4 className="font-medium text-gray-900">{file.name}</h4>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)} • {file.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.name)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Upload Progress */}
                {uploadProgress[file.name] > 0 && uploadProgress[file.name] < 100 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{uploadProgress[file.name]}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* File Metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={descriptions[file.name] || ''}
                      onChange={(e) => updateDescription(file.name, e.target.value)}
                      placeholder="Optional description..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={tags[file.name]?.join(', ') || ''}
                      onChange={(e) => updateTags(file.name, e.target.value)}
                      placeholder="tag1, tag2, tag3..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Public Toggle */}
                <div className="mt-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isPublic[file.name] || false}
                      onChange={() => togglePublic(file.name)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Make this file public</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

