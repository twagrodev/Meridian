"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const PREF_KEY = "shipments.columns";

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
