"use server";

import { revalidatePath } from "next/cache";
import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { auth } from "@/lib/auth";

const SETTINGS_PATH = join(process.cwd(), "data", "settings.json");

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "OPS_MANAGER") throw new Error("Forbidden: Admin access required");
  return session.user;
}

// ─── User Management ───────────────────────────────────────────────────

export async function createUser(formData: FormData) {
  const admin = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!name || !email || !password || !role) {
    return { error: "All fields are required" };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "A user with this email already exists" };
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashSync(password, 12),
      role,
    },
  });

  await logAudit(admin.id, "CREATE", "User", user.id, {
    name: user.name,
    email: user.email,
    role: user.role,
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateUser(userId: string, formData: FormData) {
  const admin = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const role = formData.get("role") as string;
  const active = formData.get("active") === "true";
  const newPassword = (formData.get("newPassword") as string)?.trim();

  if (!name || !email || !role) {
    return { error: "Name, email, and role are required" };
  }

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "User not found" };

  const emailConflict = await prisma.user.findFirst({
    where: { email, id: { not: userId } },
  });
  if (emailConflict) return { error: "Email already in use by another user" };

  const data: Record<string, unknown> = { name, email, role, active };
  if (newPassword) {
    if (newPassword.length < 8) return { error: "Password must be at least 8 characters" };
    data.password = hashSync(newPassword, 12);
  }

  await prisma.user.update({ where: { id: userId }, data });

  const changes: Record<string, unknown> = {};
  if (existing.name !== name) changes.name = { from: existing.name, to: name };
  if (existing.email !== email) changes.email = { from: existing.email, to: email };
  if (existing.role !== role) changes.role = { from: existing.role, to: role };
  if (existing.active !== active) changes.active = { from: existing.active, to: active };
  if (newPassword) changes.passwordChanged = true;

  await logAudit(admin.id, "UPDATE", "User", userId, changes);

  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserActive(userId: string) {
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  if (user.id === admin.id) return { error: "Cannot deactivate your own account" };

  await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  await logAudit(admin.id, user.active ? "DEACTIVATE" : "ACTIVATE", "User", userId, {
    name: user.name,
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const admin = await requireAdmin();

  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "User not found" };

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashSync(newPassword, 12) },
  });

  await logAudit(admin.id, "RESET_PASSWORD", "User", userId, { name: user.name });

  revalidatePath("/admin");
  return { success: true };
}

// ─── Settings ──────────────────────────────────────────────────────────

export type AppSettings = {
  company: {
    name: string;
    defaultPort: string;
    timezone: string;
  };
  documents: {
    maxUploadSizeMb: number;
    requiredDocTypes: string[];
    autoClassify: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    alertOnCustomsHold: boolean;
    alertOnQualityReject: boolean;
  };
  system: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    maintenanceMode: boolean;
  };
};

const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "AgroFair",
    defaultPort: "Rotterdam, Netherlands",
    timezone: "Europe/Amsterdam",
  },
  documents: {
    maxUploadSizeMb: 50,
    requiredDocTypes: ["BL", "AN", "INV", "PL", "EUR1", "WC", "COI"],
    autoClassify: true,
  },
  notifications: {
    emailEnabled: false,
    slackEnabled: false,
    alertOnCustomsHold: true,
    alertOnQualityReject: true,
  },
  system: {
    sessionTimeoutMinutes: 480,
    maxLoginAttempts: 5,
    maintenanceMode: false,
  },
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    if (existsSync(SETTINGS_PATH)) {
      const raw = await readFile(SETTINGS_PATH, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {
    // fallback to defaults
  }
  return DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings) {
  const admin = await requireAdmin();

  const dir = join(process.cwd(), "data");
  await mkdir(dir, { recursive: true });
  await writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

  await logAudit(admin.id, "UPDATE", "Settings", "system", { updated: true });

  revalidatePath("/admin");
  return { success: true };
}
