import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Image, File, X, Check } from "lucide-react";

interface UploadedDocument {
  id?: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  document_type: string;
  description?: string;
  uploaded_at?: string;
}

interface DocumentUploadProps {
  requestId: string;
  onDocumentsChange?: (documents: UploadedDocument[]) => void;
  existingDocuments?: UploadedDocument[];
}

const DocumentUpload = ({ requestId, onDocumentsChange, existingDocuments = [] }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingUploads, setPendingUploads] = useState< {
    file: File;
    document_type: string;
    description: string;
  }[]>([]);

  const documentTypes = [
    { value: 'proof_of_payment', label: 'Proof of Payment' },
    { value: 'identification', label: 'ID Document' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'other', label: 'Other' },
  ];

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4 min-w-[18px] min-h-[18px] text-muted-foreground mr-[4px]" />;
    if (fileType.includes('pdf')) return <FileText className="h-4 w-4 min-w-[18px] min-h-[18px] text-muted-foreground mr-[4px]" />;
    return <File className="h-4 w-4 min-w-[18px] min-h-[18px] text-muted-foreground mr-[4px]" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPendingUploads = acceptedFiles.map(file => ({
      file,
      document_type: 'other',
      description: '',
    }));
    setPendingUploads(prev => [...prev, ...newPendingUploads]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const updatePendingUpload = (index: number, field: string, value: string) => {
    setPendingUploads(prev => prev.map((upload, i) =>
      i === index ? { ...upload, [field]: value } : upload
    ));
  };

  const removePendingUpload = (index: number) => {
    setPendingUploads(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (!user || pendingUploads.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadedDocs: UploadedDocument[] = [];
      
      for (let i = 0; i < pendingUploads.length; i++) {
        const { file, document_type, description } = pendingUploads[i];
        
        // Upload file to Supabase Storage
        const fileName = `${user.id}/${requestId}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('request-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('request-documents')
          .getPublicUrl(fileName);

        // Save document metadata to database
        const { data: docData, error: docError } = await supabase
          .from('request_documents')
          .insert({
            request_id: requestId,
            user_id: user.id,
            filename: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            document_type,
            description: description || null,
          })
          .select()
          .single();

        if (docError) throw docError;

        uploadedDocs.push(docData);
        setUploadProgress(((i + 1) / pendingUploads.length) * 100);
      }

      // Update parent component
      onDocumentsChange?.([...existingDocuments, ...uploadedDocs]);
      setPendingUploads([]);
      
      toast({
        title: "Success",
        description: `${uploadedDocs.length} document(s) uploaded successfully`,
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to upload documents",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteDocument = async (document: UploadedDocument) => {
    if (!document.id) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('request_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      // Delete from storage
      const fileName = document.file_url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('request-documents')
          .remove([`${user?.id}/${requestId}/${fileName}`]);
      }

      // Update parent component
      const updatedDocs = existingDocuments.filter(doc => doc.id !== document.id);
      onDocumentsChange?.(updatedDocs);

      toast({
        title: "Success",
        description: "Document deleted successfully",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete document",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Upload className="h-5 w-5" />
          Document Upload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Drag and Drop Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-primary bg-primary/10' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-primary">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg font-medium mb-2 text-muted-foreground">Click or drag files to upload</p>
              <p className="text-sm text-muted-foreground">
                Supports: PDF, DOC, DOCX, PNG, JPG, JPEG (max 10MB each)
              </p>
            </div>
          )}
        </div>

        {/* Pending Uploads */}
        {pendingUploads.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-muted">Ready to Upload:</h4>
            {pendingUploads.map((upload, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div className="  flex-wrap">
                    <span className="font-medium text-sm text-muted-foreground flex gap-0 items-start">{getFileIcon(upload.file.type)}{upload.file.name}</span>
                    <span className="text-sm text-muted pl-5">
                      ({formatFileSize(upload.file.size)})
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-[8px] hover:bg-white/20"
                    onClick={() => removePendingUpload(index)}
                  >
                    <X className="h-4 w-4 text-white " />
                  </Button>
                </div>
                
                <div className="grid gap-3 md:grid-cols-1">
                  <Select 
                    value={upload.document_type}
                    onValueChange={(value) => updatePendingUpload(index, 'document_type', value)}
                  >
                    <SelectTrigger className='mt-1 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400' style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent className='border-secondary-foreground bg-black/90 text-white'>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Textarea 
                    placeholder="Description (optional)"
                    value={upload.description}
                    onChange={(e) => updatePendingUpload(index, 'description', e.target.value)}
                    className="min-h-[80px] rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent resize-none"
                  />
                </div>
              </div>
            ))

            }

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}

            <Button 
              onClick={uploadDocuments} 
              disabled={uploading || pendingUploads.some(u => !u.document_type)}
              className="w-full"
            >
              {uploading ? "Uploading..." : `Upload ${pendingUploads.length} Document(s)`}
            </Button>
          </div>
        )}

        {/* Existing Documents */}
        {existingDocuments.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-white">Uploaded Documents:</h4>
            {existingDocuments.map((doc) => (
              <div key={doc.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {getFileIcon(doc.file_type)}
                    <span className="font-normal text-sm text-white/80">{doc.filename}</span>
                    
                  </div>
                  <div className="flex items-center gap-2 pl-[30px] pt-1">
                    <Badge variant="outline">
                      {documentTypes.find(t => t.value === doc.document_type)?.label || doc.document_type}
                    </Badge>
                    <Check className="h-4 w-4 text-green-600" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-[8px] text-white hover:bg-transparent hover:text-white"
                      onClick={() => deleteDocument(doc)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p>Size: {formatFileSize(doc.file_size)}</p>
                  {doc.description && <p>Description: {doc.description}</p>}
                  {doc.uploaded_at && (
                    <p>Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentUpload;
