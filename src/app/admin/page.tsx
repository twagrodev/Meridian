import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { loadSettings } from "@/lib/actions/admin-actions";
import { AdminPanel } from "./admin-panel";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) redirect("/login");
  if (session.user.role !== "OPS_MANAGER") redirect("/");

  const [users, auditLogs, settings, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            shipments: true,
            documents: true,
            auditLogs: true,
            inspections: true,
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    }),
    loadSettings(),
    Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.shipment.count({ where: { deletedAt: null } }),
      prisma.document.count({ where: { deletedAt: null } }),
      prisma.vessel.count({ where: { deletedAt: null } }),
      prisma.container.count({ where: { deletedAt: null } }),
      prisma.customsDeclaration.count(),
      prisma.qualityInspection.count(),
      prisma.dispatchPlan.count(),
      prisma.transportLeg.count(),
      prisma.scanEvent.count(),
      prisma.auditLog.count(),
      prisma.warehouse.count(),
      prisma.producer.count(),
    ]),
  ]);

  const serializedUsers = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
  }));

  const serializedLogs = auditLogs.map((l) => ({
    id: l.id,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    metadata: l.metadata,
    userName: l.user?.name ?? "System",
    userEmail: l.user?.email ?? null,
    createdAt: l.createdAt.toISOString(),
  }));

  const [
    totalUsers, activeUsers, shipments, documents, vessels,
    containers, customs, inspections, dispatch, transport,
    scans, auditCount, warehouses, producers,
  ] = stats;

  const dbStats = {
    totalUsers, activeUsers, shipments, documents, vessels,
    containers, customs, inspections, dispatch, transport,
    scans, auditCount, warehouses, producers,
  };

  return (
    <AdminPanel
      users={serializedUsers}
      auditLogs={serializedLogs}
      settings={settings}
      dbStats={dbStats}
      currentUserId={session.user.id}
    />
  );
}
