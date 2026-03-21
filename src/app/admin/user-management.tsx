"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, UserX, UserCheck, KeyRound } from "lucide-react";
import {
  createUser,
  updateUser,
  toggleUserActive,
  resetUserPassword,
} from "@/lib/actions/admin-actions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    shipments: number;
    documents: number;
    auditLogs: number;
    inspections: number;
  };
};

const ROLES = [
  { value: "OPS_MANAGER", label: "Ops Manager" },
  { value: "LOGISTICS_COORD", label: "Logistics Coordinator" },
  { value: "CUSTOMS_SPEC", label: "Customs Specialist" },
  { value: "DOC_CLERK", label: "Document Clerk" },
];

function formatRole(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Main Component ────────────────────────────────────────────────────

export function UserManagement({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();

  async function handleToggle(userId: string) {
    const result = await toggleUserActive(userId);
    if (result.error) alert(result.error);
    else router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">User Accounts</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} users &middot; {users.filter((u) => u.active).length} active
          </p>
        </div>
        <CreateUserDialog onSuccess={() => router.refresh()} />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} className={!user.active ? "opacity-60" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {formatRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <span className="h-2 w-2 rounded-full bg-gray-400" aria-hidden="true" />
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{user._count.shipments} shipments</p>
                      <p>{user._count.documents} documents</p>
                      <p>{user._count.auditLogs} actions</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <EditUserDialog user={user} onSuccess={() => router.refresh()} />
                      <ResetPasswordDialog user={user} onSuccess={() => router.refresh()} />
                      {user.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleToggle(user.id)}
                          aria-label={user.active ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                        >
                          {user.active ? (
                            <UserX className="h-3.5 w-3.5 text-red-500" />
                          ) : (
                            <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Create User Dialog ────────────────────────────────────────────────

function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const result = await createUser(formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Add User
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Full Name</Label>
            <Input id="create-name" name="name" required placeholder="Jan de Vries" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-email">Email</Label>
            <Input id="create-email" name="email" type="email" required placeholder="jan@agrofair.nl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-password">Password</Label>
            <Input id="create-password" name="password" type="password" required minLength={8} placeholder="Min. 8 characters" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-role">Role</Label>
            <select
              id="create-role"
              name="role"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</DialogClose>
            <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create User"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit User Dialog ──────────────────────────────────────────────────

function EditUserDialog({ user, onSuccess }: { user: UserRow; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    formData.set("active", String(user.active));
    const result = await updateUser(user.id, formData);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Edit {user.name}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`edit-name-${user.id}`}>Full Name</Label>
            <Input id={`edit-name-${user.id}`} name="name" required defaultValue={user.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-email-${user.id}`}>Email</Label>
            <Input id={`edit-email-${user.id}`} name="email" type="email" required defaultValue={user.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-role-${user.id}`}>Role</Label>
            <select
              id={`edit-role-${user.id}`}
              name="role"
              required
              defaultValue={user.role}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-ring"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`edit-pw-${user.id}`}>New Password (leave blank to keep)</Label>
            <Input id={`edit-pw-${user.id}`} name="newPassword" type="password" minLength={8} placeholder="Min. 8 characters" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</DialogClose>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password Dialog ─────────────────────────────────────────────

function ResetPasswordDialog({ user, onSuccess }: { user: UserRow; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(e.currentTarget);
    const pw = formData.get("password") as string;
    const result = await resetUserPassword(user.id, pw);
    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setOpen(false);
      setLoading(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">Reset password for {user.name}</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Password</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Set a new password for <span className="font-medium text-foreground">{user.name}</span> ({user.email}).
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`reset-pw-${user.id}`}>New Password</Label>
            <Input id={`reset-pw-${user.id}`} name="password" type="password" required minLength={8} placeholder="Min. 8 characters" />
          </div>
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <DialogClose className="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent">Cancel</DialogClose>
            <Button type="submit" disabled={loading}>{loading ? "Resetting..." : "Reset Password"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
