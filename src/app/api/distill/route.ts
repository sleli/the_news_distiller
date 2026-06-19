import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isValidTone } from "@/lib/tones";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const jobs = await prisma.distillJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, topic: true, tone: true, status: true, createdAt: true },
  });

  return NextResponse.json(jobs);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let body: { topic?: unknown; tone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  const tone = body.tone;

  if (!topic || topic.length > 300) {
    return NextResponse.json(
      { error: "Il campo topic è obbligatorio e non può superare 300 caratteri." },
      { status: 400 }
    );
  }

  if (!isValidTone(tone)) {
    return NextResponse.json(
      { error: "Il tono deve essere uno tra: neutro, analitico, divulgativo, critico." },
      { status: 400 }
    );
  }

  const job = await prisma.distillJob.create({
    data: { userId: user.id, topic, tone },
  });

  return NextResponse.json(
    { jobId: job.id, message: "Richiesta in coda. Riceverai una email al completamento." },
    { status: 201 }
  );
}
