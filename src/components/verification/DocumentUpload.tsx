import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertTriangle,
  CreditCard,
  FileText,
  Building2,
  Receipt
} from 'lucide-react';

interface DocumentUploadProps {
  onSubmit: (files: File[]) => Promise<void>;
  loading?: boolean;
}

const documentTypes = [
  {
    type: 'drivers_license_front',
    title: "Driver's License (Front)",
    description: "Upload the front of your driver's license",
    icon: CreditCard,
    required: true
  },
  {
    type: 'drivers_license_back',
    title: "Driver's License (Back)",
    description: "Upload the back of your driver's license",
    icon: CreditCard,
    required: true
  },
  {
    type: 'passport',
    title: 'Passport',
    description: 'Upload the photo page of your passport',
    icon: FileText,
    required: true
  },
  {
    type: 'bank_statement',
    title: 'Bank Statement',
    description: 'Upload a recent bank statement (within 90 days)',
    icon: Building2,
    required: false
  },
  {
    type: 'utility_bill',
    title: 'Utility Bill',
    description: 'Upload a recent utility bill (within 90 days)',
    icon: Receipt,
    required: false
  }
];

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onSubmit, loading = false }) => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    onDrop: (acceptedFiles, rejectedFiles) => {
      const newErrors: string[] = [];
      
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(file => {
          if (file.file && file.file.size > 10 * 1024 * 1024) {
            newErrors.push(`${file.file.name}: File size must be less than 10MB`);
          }
          if (file.errors.some(e => e.code === 'file-invalid-type')) {
            newErrors.push(`${file.file?.name}: Only JPG, PNG, and PDF files are allowed`);
          }
        });
      }

      setErrors(newErrors);
      
      if (acceptedFiles.length > 0) {
        setUploadedFiles(prev => [...prev, ...acceptedFiles]);
      }
    }
  });

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      setErrors(['Please upload at least one required document (Driver\'s License Front/Back or Passport)']);
      return;
    }

    try {
      await onSubmit(uploadedFiles);
      setUploadedFiles([]);
      setErrors([]);
    } catch (error) {
      setErrors(['Failed to submit documents. Please try again.']);
    }
  };

  const hasRequiredDocs = uploadedFiles.length >= 1; // At least one required document (Driver's License Front/Back or Passport)

  return (
    <div className="space-y-6">
      {/* Document Requirements */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Document Requirements</h3>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Required Documents (Choose One):</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              You must upload at least one of the following for identity verification:
            </p>
            <div className="space-y-2">
              {documentTypes.filter(doc => doc.required).map((docType) => {
                const DocIcon = docType.icon;
                return (
                  <div key={docType.type} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded border">
                    <DocIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-sm font-medium">{docType.title}</span>
                      <p className="text-xs text-muted-foreground">{docType.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Optional Documents:</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Additional documents that may help with verification:
            </p>
            <div className="space-y-2">
              {documentTypes.filter(doc => !doc.required).map((docType) => {
                const DocIcon = docType.icon;
                return (
                  <div key={docType.type} className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded border">
                    <DocIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    <div>
                      <span className="text-sm font-medium">{docType.title}</span>
                      <p className="text-xs text-muted-foreground">{docType.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
        
        {errors.length > 0 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary hover:bg-primary/5'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
              <p className="text-sm text-muted-foreground">
                Supports JPG, PNG, PDF files up to 10MB each
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Uploaded Files</h3>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                <File className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={uploadedFiles.length === 0 || loading}
          className="px-8"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Submit for Review
            </>
          )}
        </Button>
      </div>

      {/* Privacy Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Notice:</strong> Your documents are encrypted and stored securely. 
          They will only be used for identity verification purposes and will be deleted after verification is complete.
          <br /><br />
          <strong>Accepted Formats:</strong> JPG, PNG, PDF files up to 10MB each.
          <br />
          <strong>Required:</strong> At least one of Driver's License (Front/Back) or Passport for verification.
        </AlertDescription>
      </Alert>
    </div>
  );
};