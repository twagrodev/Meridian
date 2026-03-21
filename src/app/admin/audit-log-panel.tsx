"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Activity } from "lucide-react";

export type AuditLogEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  userName: string;
  userEmail: string | null;
  createdAt: string;
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  DEACTIVATE: "bg-orange-100 text-orange-700",
  ACTIVATE: "bg-green-100 text-green-700",
  RESET_PASSWORD: "bg-yellow-100 text-yellow-700",
};

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditLogPanel({ logs }: { logs: AuditLogEntry[] }) {
  const [search, setSearch] = useState("");

  const filtered = logs.filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(term) ||
      log.entityType.toLowerCase().includes(term) ||
      log.userName.toLowerCase().includes(term) ||
      log.entityId.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true" />
            Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">
            Last 100 system events
          </p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Filter logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
            aria-label="Filter audit logs"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="divide-y">
              {filtered.length === 0 && (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  No matching log entries
                </div>
              )}
              {filtered.map((log) => {
                let meta: Record<string, unknown> | null = null;
                try {
                  if (log.metadata) meta = JSON.parse(log.metadata);
                } catch { /* ignore */ }

                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <span className="text-xs font-bold">
                        {log.action[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{log.userName}</span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 border-0 ${
                            ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {log.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {log.entityType}
                        </span>
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-32">
                          {log.entityId.slice(0, 12)}
                        </span>
                      </div>
                      {meta && Object.keys(meta).length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">
                          {Object.entries(meta)
                            .map(([k, v]) => {
                              if (typeof v === "object" && v !== null && "from" in v && "to" in v) {
                                const obj = v as { from: unknown; to: unknown };
                                return `${k}: ${obj.from} \u2192 ${obj.to}`;
                              }
                              return `${k}: ${JSON.stringify(v)}`;
                            })
                            .join(" \u00B7 ")}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatTimestamp(log.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
