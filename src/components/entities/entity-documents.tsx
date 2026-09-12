"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, documentLabel, documentTone } from "@/components/status-badge";
import { FileText, Loader2, Paperclip } from "lucide-react";

interface EntityDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  status: string;
}

export function EntityDocuments({
  entityId,
  documents,
}: {
  entityId: string;
  documents: EntityDocument[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityId", entityId);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not attach that file");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not attach that file");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No documents attached"
          description="Attach a receipt, invoice, or a photo of this item."
        />
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between gap-2 rounded border p-2"
            >
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{doc.fileName}</span>
              </a>
              <StatusBadge tone={documentTone(doc.status)}>
                {documentLabel(doc.status)}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        id={`attach-${entityId}`}
        accept="image/*,.pdf,.doc,.docx,.txt"
        onChange={handleSelect}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 aria-hidden className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Paperclip aria-hidden className="mr-2 h-3.5 w-3.5" />
        )}
        {isUploading ? "Attaching…" : "Attach document"}
      </Button>
    </div>
  );
}
