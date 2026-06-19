import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const { id } = await params;

  const job = await prisma.distillJob.findUnique({
    where: { id },
  });

  if (!job || job.userId !== user.id) {
    return NextResponse.json({ error: "Job non trovato." }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    topic: job.topic,
    tone: job.tone,
    status: job.status,
    createdAt: job.createdAt,
  });
}
