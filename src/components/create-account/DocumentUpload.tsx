import { FormData } from "@/pages/CreateAccount";
import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, CheckCircle, CreditCard, FileText, Building2, Receipt } from "lucide-react";

interface DocumentUploadProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  errors: string[];
}

const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface DocumentType {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  required: boolean;
  maxFiles?: number;
}

const DOCUMENT_TYPES: DocumentType[] = [
  {
    id: 'drivers_license_front',
    name: "Driver's License (Front)",
    description: "Upload the front of your driver's license",
    icon: CreditCard,
    required: true,
    maxFiles: 1
  },
  {
    id: 'drivers_license_back',
    name: "Driver's License (Back)",
    description: "Upload the back of your driver's license",
    icon: CreditCard,
    required: true,
    maxFiles: 1
  },
  {
    id: 'passport',
    name: "Passport",
    description: "Upload the photo page of your passport",
    icon: FileText,
    required: true,
    maxFiles: 1
  },
  {
    id: 'bank_statement',
    name: "Bank Statement",
    description: "Upload a recent bank statement (within 90 days)",
    icon: Building2,
    required: false,
    maxFiles: 1
  },
  {
    id: 'utility_bill',
    name: "Utility Bill",
    description: "Upload a recent utility bill (within 90 days)",
    icon: Receipt,
    required: false,
    maxFiles: 1
  }
];

const DocumentUpload = ({ formData, updateFormData, errors }: DocumentUploadProps) => {
  // Initialize documents by type if not exists
  const documentsByType = formData.documentsByType || {};

  const onDrop = useCallback((acceptedFiles: File[], documentTypeId: string) => {
    const currentFiles = documentsByType[documentTypeId] || [];
    const documentType = DOCUMENT_TYPES.find(dt => dt.id === documentTypeId);
    
    if (documentType?.maxFiles) {
      const remainingSlots = documentType.maxFiles - currentFiles.length;
      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      const newFiles = [...currentFiles, ...filesToAdd];
      
      const updatedDocumentsByType = {
        ...documentsByType,
        [documentTypeId]: newFiles
      };
      
      updateFormData({ documentsByType: updatedDocumentsByType });
    }
  }, [documentsByType, updateFormData]);

  const removeFile = (documentTypeId: string, fileIndex: number) => {
    const currentFiles = documentsByType[documentTypeId] || [];
    const newFiles = currentFiles.filter((_, i) => i !== fileIndex);
    
    const updatedDocumentsByType = {
      ...documentsByType,
      [documentTypeId]: newFiles
    };
    
    updateFormData({ documentsByType: updatedDocumentsByType });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Individual dropzone component for each document type
  const DocumentDropzone = ({ documentType }: { documentType: DocumentType }) => {
    const currentFiles = documentsByType[documentType.id] || [];
    const isFull = documentType.maxFiles ? currentFiles.length >= documentType.maxFiles : false;
    const IconComponent = documentType.icon;

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => onDrop(acceptedFiles, documentType.id),
      accept: ACCEPTED_FILE_TYPES,
      maxSize: MAX_FILE_SIZE,
      multiple: documentType.maxFiles ? documentType.maxFiles > 1 : false,
      disabled: isFull,
    });

    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <IconComponent className="h-6 w-6 text-primary" />
            <div>
              <h4 className="font-semibold flex items-center gap-2 text-white">
                {documentType.name}
                {documentType.required && <span className="text-red-500">*</span>}
                {currentFiles.length > 0 && <CheckCircle className="h-4 w-4 text-green-500" />}
              </h4>
              <p className="text-sm text-muted-foreground">{documentType.description}</p>
            </div>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isFull 
                ? 'border-green-500 bg-green-50 cursor-default'
                : isDragActive
                  ? 'border-primary bg-primary/10 cursor-pointer'
                  : 'border-muted-foreground/25 hover:border-primary/50 cursor-pointer'
            }`}
          >
            <input {...getInputProps()} />
            {isFull ? (
              <div className="text-green-600">
                <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Upload Complete</p>
                <p className="text-sm">All required files uploaded</p>
              </div>
            ) : isDragActive ? (
              <div className="text-primary">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Drop files here...</p>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="font-medium mb-1">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Accepted: JPG, PNG, PDF (max 5MB each)
                  {documentType.maxFiles && ` • Max ${documentType.maxFiles} file${documentType.maxFiles > 1 ? 's' : ''}`}
                </p>
                <Button variant="outline" size="sm">Browse Files</Button>
              </div>
            )}
          </div>

          {/* Uploaded Files for this type */}
          {currentFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">Uploaded Files ({currentFiles.length})</h5>
              <div className="space-y-2">
                {currentFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(documentType.id, index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div>
        {/* <h3 className="text-lg font-semibold mb-2 text-white">Document Upload</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please upload the required documents for identity verification. Each document type has its own upload area.
        </p> */}
      </div>

      {/* Individual Document Upload Areas */}
      {DOCUMENT_TYPES.map((documentType) => (
        <DocumentDropzone key={documentType.id} documentType={documentType} />
      ))}

      <Alert className="bg-white/10 border border-secondary-foreground text-white rounded-sm">
        <Upload className="h-4 w-4 !text-primary" />
        <AlertDescription>
          <strong className="text-red-500">Privacy Notice:</strong> All uploaded documents are encrypted and stored securely. 
          We use this information only for identity verification and regulatory compliance.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DocumentUpload;