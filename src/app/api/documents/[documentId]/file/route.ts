import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const { documentId } = await params;

  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.deletedAt) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = join(process.cwd(), "uploads", doc.fileName);

  if (!existsSync(filePath)) {
    return new Response("File not found on disk", { status: 404 });
  }

  const buffer = await readFile(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": doc.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
