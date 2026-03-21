"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Database,
  Users,
  Package,
  Ship,
  Box,
  FileText,
  FileCheck,
  ClipboardCheck,
  Truck,
  Route,
  ScanBarcode,
  Activity,
  Warehouse,
  Building2,
} from "lucide-react";

export type DbStats = {
  totalUsers: number;
  activeUsers: number;
  shipments: number;
  documents: number;
  vessels: number;
  containers: number;
  customs: number;
  inspections: number;
  dispatch: number;
  transport: number;
  scans: number;
  auditCount: number;
  warehouses: number;
  producers: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div className="rounded-md bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export function SystemPanel({ stats }: { stats: DbStats }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" aria-hidden="true" />
          System Overview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Database statistics and platform information
        </p>
      </div>

      {/* Database stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Database Records</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <StatCard label="Users" value={stats.totalUsers} icon={Users} />
            <StatCard label="Active Users" value={stats.activeUsers} icon={Users} />
            <StatCard label="Producers" value={stats.producers} icon={Building2} />
            <StatCard label="Shipments" value={stats.shipments} icon={Package} />
            <StatCard label="Vessels" value={stats.vessels} icon={Ship} />
            <StatCard label="Containers" value={stats.containers} icon={Box} />
            <StatCard label="Documents" value={stats.documents} icon={FileText} />
            <StatCard label="Customs" value={stats.customs} icon={FileCheck} />
            <StatCard label="Inspections" value={stats.inspections} icon={ClipboardCheck} />
            <StatCard label="Dispatch Plans" value={stats.dispatch} icon={Truck} />
            <StatCard label="Transport Legs" value={stats.transport} icon={Route} />
            <StatCard label="Scan Events" value={stats.scans} icon={ScanBarcode} />
            <StatCard label="Warehouses" value={stats.warehouses} icon={Warehouse} />
            <StatCard label="Audit Entries" value={stats.auditCount} icon={Activity} />
          </div>
        </CardContent>
      </Card>

      {/* Platform info */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Application" value="Meridian" />
            <InfoRow label="Version" value="1.0.0" />
            <InfoRow label="Framework" value="Next.js 16.2 (App Router)" />
            <InfoRow label="UI" value="shadcn/ui + Tailwind CSS v4" />
            <InfoRow label="Database" value="SQLite (Prisma 7 + libsql)" />
            <InfoRow label="Auth" value="Auth.js v5 (JWT)" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Environment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <InfoRow label="Node.js" value={typeof process !== "undefined" ? process.version ?? "N/A" : "N/A"} />
            <InfoRow label="Environment" value={process.env.NODE_ENV ?? "development"} />
            <InfoRow label="Platform" value="Windows 11" />
            <InfoRow label="Database URL" value="file:./prisma/dev.db" />
            <InfoRow label="Session Strategy" value="JWT (credentials)" />
            <InfoRow label="Roles" value="4 (OPS, LOG, CUS, DOC)" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium font-mono text-xs">{value}</span>
    </div>
  );
}
