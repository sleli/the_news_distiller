import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_CLAUDE_MODES = ["API_KEY", "CLI_SUBPROCESS"] as const;
type ClaudeMode = (typeof VALID_CLAUDE_MODES)[number];

function isValidClaudeMode(value: unknown): value is ClaudeMode {
  return VALID_CLAUDE_MODES.includes(value as ClaudeMode);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });

  return NextResponse.json({
    claudeMode: settings?.claudeMode ?? "API_KEY",
  });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  let body: { claudeMode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if (!isValidClaudeMode(body.claudeMode)) {
    return NextResponse.json(
      { error: "claudeMode deve essere 'API_KEY' oppure 'CLI_SUBPROCESS'." },
      { status: 400 }
    );
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: "default" },
    update: { claudeMode: body.claudeMode },
    create: { id: "default", claudeMode: body.claudeMode },
  });

  return NextResponse.json({ claudeMode: settings.claudeMode });
}
