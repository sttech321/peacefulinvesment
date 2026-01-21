import { FormData } from "@/pages/CreateAccount";
import { useCallback, useMemo, useState } from "react";
import type { ComponentType } from "react";
import { useDropzone } from "react-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, File, X, CheckCircle, CreditCard, FileText, Building2, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

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
  icon: ComponentType<any>;
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

const STORAGE_BUCKET = "kyc-documents";

type UploadedMeta = {
  path: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

const DocumentUpload = ({ formData, updateFormData, errors }: DocumentUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Never trust incoming shape (backwards compatibility): enforce Record<string, string[]>
  const documentsByType = useMemo<Record<string, string[]>>(() => {
    const raw: any = (formData as any)?.documentsByType ?? {};
    const out: Record<string, string[]> = {};
    if (!raw || typeof raw !== "object") return out;
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) {
        out[k] = (v as any[]).filter((x) => typeof x === "string" && x.trim().length > 0) as string[];
      }
    }
    return out;
  }, [(formData as any)?.documentsByType]);

  const [uploadingByType, setUploadingByType] = useState<Record<string, boolean>>({});
  const [uploadedMetaByType, setUploadedMetaByType] = useState<Record<string, UploadedMeta[]>>({});
  const [localErrors, setLocalErrors] = useState<string[]>([]);

  const getExt = useCallback((file: File) => {
    const fromName = (file.name || "").split(".").pop()?.toLowerCase();
    const normalized = fromName === "jpeg" ? "jpg" : fromName;
    if (normalized && ["jpg", "jpeg", "png", "pdf"].includes(normalized)) return normalized === "jpeg" ? "jpg" : normalized;
    if (file.type === "image/jpeg") return "jpg";
    if (file.type === "image/png") return "png";
    if (file.type === "application/pdf") return "pdf";
    return "bin";
  }, []);

  const ensureAuthedUserId = useCallback(() => {
    const userId = user?.id;
    if (!userId) {
      const msg = "You must be signed in to upload documents.";
      setLocalErrors((prev) => [...prev, msg]);
      toast({ title: "Upload Error", description: msg, variant: "destructive" });
      return null;
    }
    return userId;
  }, [toast, user?.id]);

  const onDrop = useCallback(async (acceptedFiles: File[], documentTypeId: string) => {
    setLocalErrors([]);
    const userId = ensureAuthedUserId();
    if (!userId) return;

    const currentPaths = documentsByType[documentTypeId] || [];
    const documentType = DOCUMENT_TYPES.find(dt => dt.id === documentTypeId);

    if (!documentType?.maxFiles) return;
    if (uploadingByType[documentTypeId]) return;

    const remainingSlots = documentType.maxFiles - currentPaths.length;
    const filesToAdd = acceptedFiles.slice(0, Math.max(0, remainingSlots));
    if (filesToAdd.length === 0) return;

    setUploadingByType((prev) => ({ ...prev, [documentTypeId]: true }));

    try {
      for (const file of filesToAdd) {
        const ext = getExt(file);
        const storagePath = `users/${userId}/${documentTypeId}.${ext}`;

        // 1) Upload to private bucket
        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            upsert: true,
            contentType: file.type,
          });
        if (uploadError) throw uploadError;

        // 2) Insert metadata row (best-effort if RLS blocks; but we want this row)
        const { error: insertError } = await (supabase as any)
          .from("kyc_documents")
          .insert({
            user_id: userId,
            document_type: documentTypeId,
            file_name: file.name,
            file_path: storagePath,
            mime_type: file.type,
            file_size: file.size,
          });
        if (insertError) {
          // Cleanup storage to avoid orphaned objects
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]).catch(() => undefined);
          throw insertError;
        }

        // 3) Update profiles.documents_by_type with SUPABASE PATHS ONLY
        const updatedDocumentsByType: Record<string, string[]> = {
          ...documentsByType,
          [documentTypeId]: [...(documentsByType[documentTypeId] || []).filter(Boolean), storagePath],
        };

        const { error: profileUpdateError } = await supabase
          .from("profiles")
          .update({ documents_by_type: updatedDocumentsByType })
          .eq("user_id", userId);
        if (profileUpdateError) throw profileUpdateError;

        // 4) Update local form state (used by step completion + review UI)
        updateFormData({ documentsByType: updatedDocumentsByType });

        // 5) Keep lightweight metadata for display only (never stored to DB/JSON)
        setUploadedMetaByType((prev) => ({
          ...prev,
          [documentTypeId]: [
            ...(prev[documentTypeId] || []),
            { path: storagePath, fileName: file.name, fileSize: file.size, mimeType: file.type },
          ],
        }));
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to upload document. Please try again.";
      setLocalErrors((prev) => [...prev, msg]);
      toast({ title: "Upload Error", description: msg, variant: "destructive" });
    } finally {
      setUploadingByType((prev) => ({ ...prev, [documentTypeId]: false }));
    }
  }, [documentsByType, ensureAuthedUserId, toast, updateFormData, uploadingByType, user]);

  const removeFile = async (documentTypeId: string, fileIndex: number) => {
    setLocalErrors([]);
    const userId = ensureAuthedUserId();
    if (!userId) return;

    const currentPaths = documentsByType[documentTypeId] || [];
    const pathToRemove = currentPaths[fileIndex];
    const newPaths = currentPaths.filter((_, i) => i !== fileIndex);

    const updatedDocumentsByType: Record<string, string[]> = {
      ...documentsByType,
      [documentTypeId]: newPaths,
    };

    // Optimistically update local state (step completion stays responsive)
    updateFormData({ documentsByType: updatedDocumentsByType });
    setUploadedMetaByType((prev) => ({
      ...prev,
      [documentTypeId]: (prev[documentTypeId] || []).filter((m) => m.path !== pathToRemove),
    }));

    try {
      // Update profile jsonb first (this drives completion logic)
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ documents_by_type: updatedDocumentsByType })
        .eq("user_id", userId);
      if (profileUpdateError) throw profileUpdateError;

      // Remove DB metadata row (best-effort)
      await (supabase as any)
        .from("kyc_documents")
        .delete()
        .eq("user_id", userId)
        .eq("document_type", documentTypeId)
        .eq("file_path", pathToRemove);

      // Remove from storage (best-effort)
      if (pathToRemove) {
        await supabase.storage.from(STORAGE_BUCKET).remove([pathToRemove]);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to remove document. Please refresh and try again.";
      setLocalErrors((prev) => [...prev, msg]);
      toast({ title: "Remove Error", description: msg, variant: "destructive" });
    }
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
    const currentPaths = documentsByType[documentType.id] || [];
    const isFull = documentType.maxFiles ? currentPaths.length >= documentType.maxFiles : false;
    const IconComponent = documentType.icon;
    const isUploading = Boolean(uploadingByType[documentType.id]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => onDrop(acceptedFiles, documentType.id),
      accept: ACCEPTED_FILE_TYPES,
      maxSize: MAX_FILE_SIZE,
      multiple: documentType.maxFiles ? documentType.maxFiles > 1 : false,
      disabled: isFull || isUploading,
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
                {currentPaths.length > 0 && <CheckCircle className="h-4 w-4 text-green-500" />}
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
            {isUploading ? (
              <div className="text-primary">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium">Uploading...</p>
                <p className="text-sm">Please wait</p>
              </div>
            ) : isFull ? (
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
                <p className="text-sm text-muted-foreground mb-1">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Accepted: JPG, PNG, PDF (max 5MB each)
                  {documentType.maxFiles && ` • Max ${documentType.maxFiles} file${documentType.maxFiles > 1 ? 's' : ''}`}
                </p>
                <Button variant="outline" size="sm">Browse Files</Button>
              </div>
            )}
          </div>

          {/* Uploaded Files for this type */}
          {currentPaths.length > 0 && (
            <div className="mt-4 space-y-2">
              <h5 className="text-sm font-medium text-muted-foreground">Uploaded Files ({currentPaths.length})</h5>
              <div className="space-y-2">
                {currentPaths.map((path, index) => {
                  const meta = (uploadedMetaByType[documentType.id] || []).find((m) => m.path === path);
                  const displayName = meta?.fileName || path.split("/").pop() || "Document";
                  const displaySize = meta?.fileSize ?? 0;
                  return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <File className="h-4 w-4 text-primary" />
                      <div>
                        <p className="font-medium text-sm text-muted-foreground">{displayName}</p>
                        {displaySize > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(displaySize)}
                          </p>
                        )}
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
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {(errors.length > 0 || localErrors.length > 0) && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {errors.map((error, index) => (<li key={`prop-${index}`}>{error}</li>))}
              {localErrors.map((error, index) => (<li key={`local-${index}`}>{error}</li>))}
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