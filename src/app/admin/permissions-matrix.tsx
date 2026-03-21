"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RBAC, type UserRole } from "@/types/index";
import { Shield, Eye, Pencil, Ban } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<UserRole, string> = {
  OPS_MANAGER: "Ops Manager",
  LOGISTICS_COORD: "Logistics Coord",
  CUSTOMS_SPEC: "Customs Specialist",
  DOC_CLERK: "Document Clerk",
};

const MODULE_LABELS: Record<string, string> = {
  shipments: "Shipments",
  vessels: "Vessels",
  documents: "Documents",
  quality: "Quality",
  customs: "Customs",
  dispatch: "Dispatch",
  transport: "Transport",
  scanner: "Scanner",
  users: "User Admin",
};

const roles: UserRole[] = ["OPS_MANAGER", "LOGISTICS_COORD", "CUSTOMS_SPEC", "DOC_CLERK"];
const modules = Object.keys(RBAC);

function PermissionBadge({ level }: { level: "R" | "RW" | null }) {
  if (level === "RW") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Pencil className="h-3 w-3" aria-hidden="true" />
        Read &amp; Write
      </span>
    );
  }
  if (level === "R") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        <Eye className="h-3 w-3" aria-hidden="true" />
        Read Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
      <Ban className="h-3 w-3" aria-hidden="true" />
      No Access
    </span>
  );
}

export function PermissionsMatrix() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" aria-hidden="true" />
          Role-Based Access Control
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Permissions are determined by user role. Change a user&apos;s role in the Users tab to update their access.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Permission Matrix</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Module</TableHead>
                {roles.map((role) => (
                  <TableHead key={role} className="text-center">
                    {ROLE_LABELS[role]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.map((mod) => (
                <TableRow key={mod}>
                  <TableCell className="font-medium">
                    {MODULE_LABELS[mod] ?? mod}
                  </TableCell>
                  {roles.map((role) => (
                    <TableCell key={role} className="text-center">
                      <PermissionBadge level={RBAC[mod][role]} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Role descriptions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const rwCount = modules.filter((m) => RBAC[m][role] === "RW").length;
          const rCount = modules.filter((m) => RBAC[m][role] === "R").length;
          const noCount = modules.filter((m) => RBAC[m][role] === null).length;
          return (
            <Card key={role}>
              <CardContent className="p-4">
                <h3 className="font-semibold text-sm">{ROLE_LABELS[role]}</h3>
                <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                  <span className={cn("font-medium", rwCount > 0 && "text-emerald-700")}>
                    {rwCount} read-write
                  </span>
                  <span className={cn("font-medium", rCount > 0 && "text-blue-700")}>
                    {rCount} read-only
                  </span>
                  {noCount > 0 && (
                    <span className="font-medium text-gray-500">{noCount} restricted</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
