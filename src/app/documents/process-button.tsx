"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Play } from "lucide-react";
import { processDocument, processAllDocuments } from "@/lib/actions/process-document";

export function ProcessDocumentButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleProcess() {
    setLoading(true);
    setResult(null);
    const res = await processDocument(documentId);
    setLoading(false);

    if (res.success) {
      setResult(
        `${res.docType ?? "Unknown"} (${res.confidence}) — ${res.matchStatus}` +
        (res.matchedBy ? ` via ${res.matchedBy}` : "") +
        ` — ${res.fieldCount} fields`
      );
    } else {
      setResult(`Failed: ${res.error ?? "Unknown error"}`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={handleProcess}
        disabled={loading}
        size="sm"
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {loading ? "Processing..." : "Process"}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground" role="status">{result}</p>
      )}
    </div>
  );
}

export function ProcessAllButton({ count }: { count: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleProcessAll() {
    setLoading(true);
    setResult(null);
    const results = await processAllDocuments();
    setLoading(false);

    const matched = results.filter((r) => r.matchStatus === "matched").length;
    const classified = results.filter((r) => r.matchStatus === "unmatched" && r.success).length;
    const failed = results.filter((r) => !r.success).length;

    setResult(`Processed ${results.length}: ${matched} matched, ${classified} classified, ${failed} failed`);
    router.refresh();
  }

  if (count === 0) return null;

  return (
    <div className="space-y-1">
      <Button
        onClick={handleProcessAll}
        disabled={loading}
        size="sm"
        variant="outline"
        className="gap-1.5"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Play className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {loading ? "Processing..." : `Process All (${count})`}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground" role="status">{result}</p>
      )}
    </div>
  );
}
