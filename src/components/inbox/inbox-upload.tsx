"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, File, Loader2, CheckCircle } from "lucide-react";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";

interface ExtractedField {
  value: unknown;
  confidence: number;
  source: string;
}

interface ExtractionResult {
  entityType: string;
  fields: Record<string, ExtractedField>;
  suggestedRelations?: Array<{
    targetType: string;
    relationType: string;
    confidence: number;
  }>;
}

interface PendingExtraction {
  documentId: string;
  fileName: string;
  extraction: ExtractionResult;
}

const ENTITY_TYPES = Object.keys(ENTITY_TYPE_CONFIG) as EntityType[];

export function InboxUpload() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingExtraction | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{ entityId: string; remindersCreated: number } | null>(null);

  const [entityType, setEntityType] = useState<EntityType>("purchase");
  const [entityName, setEntityName] = useState("");
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      void handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleFileUpload(files[0]);
    }
    e.target.value = "";
  }, []);

  async function handleFileUpload(file: File) {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setPending(null);
    setConfirmed(null);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/inbox", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      if (data.extraction) {
        const extraction = data.extraction as ExtractionResult;
        const initialType = ENTITY_TYPES.includes(extraction.entityType as EntityType)
          ? (extraction.entityType as EntityType)
          : "purchase";
        setEntityType(initialType);

        const merchant =
          extraction.fields.merchant?.value ?? extraction.fields.product?.value;
        setEntityName(
          typeof merchant === "string" && merchant ? `${merchant} ${initialType}` : file.name
        );

        const initial: Record<string, string> = {};
        for (const [key, field] of Object.entries(extraction.fields)) {
          initial[key] = String(field.value ?? "");
        }
        setEditedFields(initial);

        setPending({
          documentId: data.document.id as string,
          fileName: file.name,
          extraction,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError("Upload failed. Please try again.");
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  }

  async function handleConfirm() {
    if (!pending) return;
    setIsConfirming(true);
    setConfirmError(null);

    try {
      const fields: Record<string, ExtractedField> = {};
      for (const [key, original] of Object.entries(pending.extraction.fields)) {
        const edited = editedFields[key] ?? "";
        const num = Number(edited);
        fields[key] = {
          value: edited !== "" && !isNaN(num) && typeof original.value === "number" ? num : edited,
          confidence: original.confidence,
          source: edited !== String(original.value ?? "") ? "user_confirmed" : original.source,
        };
      }

      const response = await fetch("/api/inbox/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: pending.documentId,
          entityType,
          name: entityName.trim() || pending.fileName,
          fields,
          suggestedRelations: pending.extraction.suggestedRelations || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setConfirmError(data.error || "Could not save to Life Graph");
        return;
      }

      setConfirmed({
        entityId: data.entity.id as string,
        remindersCreated: data.remindersCreated as number,
      });
      setPending(null);
    } catch (error) {
      console.error("Confirm error:", error);
      setConfirmError("Could not save. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <div className="text-center">
            <p className="text-lg font-medium">Drop files here or click to upload</p>
            <p className="text-sm text-muted-foreground mt-1">
              Supports receipts, bills, warranties, contracts (PDF, images, Word, text)
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            id="file-upload"
            accept="image/*,.pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />
          <Button
            variant="outline"
            className="mt-4"
            type="button"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            Select File
          </Button>
        </CardContent>
      </Card>

      {uploadError && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{uploadError}</p>
          </CardContent>
        </Card>
      )}

      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-primary animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">Processing document...</p>
                <Progress value={uploadProgress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {confirmed && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Saved to Life Admin Graph</p>
                <p className="text-sm text-green-600">
                  {confirmed.remindersCreated} reminder
                  {confirmed.remindersCreated !== 1 ? "s" : ""} created.
                </p>
              </div>
            </div>
            <Button className="mt-4" onClick={() => router.push("/life")}>
              View in Life Graph
            </Button>
          </CardContent>
        </Card>
      )}

      {pending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review extraction: {pending.fileName}
            </CardTitle>
            <CardDescription>
              AI detected a <strong>{pending.extraction.entityType}</strong>. Correct anything
              wrong, then save. Low-confidence fields need your eye.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entity-type">Save as</Label>
                <Select
                  value={entityType}
                  onValueChange={(v) => setEntityType(v as EntityType)}
                >
                  <SelectTrigger id="entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ENTITY_TYPE_CONFIG[t].icon} {ENTITY_TYPE_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity-name">Name</Label>
                <Input
                  id="entity-name"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="e.g. Samsung TV purchase"
                />
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(pending.extraction.fields).map(([key, field]) => {
                const low = field.confidence < 0.7;
                return (
                  <div
                    key={key}
                    className={`rounded border p-3 ${low ? "border-yellow-400 bg-yellow-50" : ""}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Label className="capitalize" htmlFor={`field-${key}`}>
                        {key.replace(/_/g, " ")}
                        {low && <span className="ml-2 text-yellow-600">— please verify</span>}
                      </Label>
                      <span
                        className={`text-xs font-medium ${
                          field.confidence >= 0.9
                            ? "text-green-500"
                            : field.confidence >= 0.7
                              ? "text-yellow-600"
                              : "text-red-500"
                        }`}
                      >
                        {Math.round(field.confidence * 100)}%
                      </span>
                    </div>
                    <Input
                      id={`field-${key}`}
                      value={editedFields[key] ?? ""}
                      onChange={(e) =>
                        setEditedFields((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </div>
                );
              })}
            </div>

            {confirmError && <p className="text-sm text-destructive">{confirmError}</p>}

            <div className="flex gap-2">
              <Button onClick={handleConfirm} disabled={isConfirming}>
                {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save to Life Graph
              </Button>
              <Button variant="outline" onClick={() => setPending(null)} disabled={isConfirming}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
