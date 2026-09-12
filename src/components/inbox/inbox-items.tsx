"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge, documentLabel, documentTone } from "@/components/status-badge";
import { FileText, Loader2, RotateCcw } from "lucide-react";

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  status: string;
  createdAt: string;
  extractedData: Record<string, unknown>;
}

interface InboxItemsProps {
  userId: string;
}

export function InboxItems({ userId }: InboxItemsProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function retryExtraction(id: string) {
    setRetryingId(id);
    setRetryError(null);
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry" }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setRetryError(data.error || "Could not retry extraction");
        return;
      }

      // The list is fetched client-side, so update it in place rather than
      // refetching the whole collection.
      setDocuments((docs) =>
        docs.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                status: data.document.status,
                extractedData: data.document.extractedData,
              }
            : doc
        )
      );
    } catch {
      setRetryError("Could not retry extraction");
    } finally {
      setRetryingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/inbox");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setDocuments(data.documents || []);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
      </CardHeader>
      <CardContent>
        {retryError && (
          <p role="alert" className="mb-3 text-sm text-destructive">
            {retryError}
          </p>
        )}
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Upload your first receipt or bill above."
          />
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <FileText aria-hidden className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge tone={documentTone(doc.status)}>
                    {documentLabel(doc.status)}
                  </StatusBadge>
                  {doc.status === "failed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryExtraction(doc.id)}
                      disabled={retryingId === doc.id}
                      aria-label={`Retry extraction for ${doc.fileName}`}
                    >
                      {retryingId === doc.id ? (
                        <Loader2 aria-hidden className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw aria-hidden className="mr-1 h-3 w-3" />
                          Retry
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
