"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const PREF_KEY = "shipments.columns";
const TABLE_PREFS_KEY = "shipments.tablePrefs";

export interface ColumnPreference {
  key: string;
  visible: boolean;
}

export async function getColumnPreferences(): Promise<ColumnPreference[] | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const pref = await prisma.userPreference.findUnique({
    where: { userId_key: { userId: session.user.id, key: PREF_KEY } },
  });
  if (!pref) return null;

  try {
    const parsed = JSON.parse(pref.value) as ColumnPreference[];
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveColumnPreferences(prefs: ColumnPreference[]): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const visibleCount = prefs.filter((p) => p.visible).length;
  if (visibleCount < 2) return { error: "At least 2 columns must be visible" };

  await prisma.userPreference.upsert({
    where: { userId_key: { userId: session.user.id, key: PREF_KEY } },
    create: { userId: session.user.id, key: PREF_KEY, value: JSON.stringify(prefs) },
    update: { value: JSON.stringify(prefs) },
  });

  return {};
}

export async function resetColumnPreferences(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.userPreference.deleteMany({
    where: { userId: session.user.id, key: PREF_KEY },
  });
}

// ── Table UI Preferences (collapsed, showTime, showCustoms, colWidths) ──

export interface TablePrefs {
  isCollapsed: boolean;
  showTime: boolean;
  showCustoms: boolean;
  colWidths: Record<string, number>; // column header → width
  sortKey: string | null;
  sortDir: "asc" | "desc";
}

export async function getTablePreferences(): Promise<TablePrefs | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const pref = await prisma.userPreference.findUnique({
    where: { userId_key: { userId: session.user.id, key: TABLE_PREFS_KEY } },
  });
  if (!pref) return null;

  try {
    const parsed = JSON.parse(pref.value) as TablePrefs;
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveTablePreferences(prefs: TablePrefs): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  await prisma.userPreference.upsert({
    where: { userId_key: { userId: session.user.id, key: TABLE_PREFS_KEY } },
    create: { userId: session.user.id, key: TABLE_PREFS_KEY, value: JSON.stringify(prefs) },
    update: { value: JSON.stringify(prefs) },
  });

  return {};
}
