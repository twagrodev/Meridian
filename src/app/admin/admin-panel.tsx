"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Settings, Activity, Database } from "lucide-react";
import { UserManagement, type UserRow } from "./user-management";
import { PermissionsMatrix } from "./permissions-matrix";
import { SettingsPanel } from "./settings-panel";
import { AuditLogPanel, type AuditLogEntry } from "./audit-log-panel";
import { SystemPanel, type DbStats } from "./system-panel";
import type { AppSettings } from "@/lib/actions/admin-actions";

interface AdminPanelProps {
  users: UserRow[];
  auditLogs: AuditLogEntry[];
  settings: AppSettings;
  dbStats: DbStats;
  currentUserId: string;
}

export function AdminPanel({
  users,
  auditLogs,
  settings,
  dbStats,
  currentUserId,
}: AdminPanelProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-[family-name:var(--font-work-sans)]">
          Administration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage users, permissions, and system settings
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            Users
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" aria-hidden="true" />
            Roles &amp; Permissions
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" aria-hidden="true" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            System
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UserManagement users={users} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-6">
          <PermissionsMatrix />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsPanel initialSettings={settings} />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AuditLogPanel logs={auditLogs} />
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <SystemPanel stats={dbStats} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
