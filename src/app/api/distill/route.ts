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
    select: {
      id: true,
      topic: true,
      tone: true,
      status: true,
      createdAt: true,
      result: true,
      sources: { select: { id: true, position: true } },
    },
  });

  const jobsWithMeta = jobs.map((job) => {
    if (job.status !== "DONE") {
      return { ...job, result: undefined, sources: undefined, snippet: null, sourceCount: null, positionCount: null };
    }
    let snippet: string | null = null;
    let sourceCount: number | null = null;
    let positionCount: number | null = null;
    try {
      const parsed = job.result as { summary?: string } | null;
      if (parsed?.summary) {
        snippet = parsed.summary.length > 120 ? parsed.summary.slice(0, 120) + "…" : parsed.summary;
      }
    } catch {
      // malformed JSON — fields stay null
    }
    sourceCount = job.sources.length;
    positionCount = new Set(job.sources.map((s) => s.position)).size;
    return { ...job, result: undefined, sources: undefined, snippet, sourceCount, positionCount };
  });

  return NextResponse.json(jobsWithMeta);
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

  // Il job resta in stato PENDING: l'elaborazione è demandata interamente al
  // worker (worker/index.ts), unico processore con claim atomico e recovery.
  return NextResponse.json(
    { jobId: job.id, message: "Richiesta in coda. Riceverai una email al completamento." },
    { status: 201 }
  );
}
