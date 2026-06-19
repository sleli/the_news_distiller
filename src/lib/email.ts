import "server-only";
import { Resend } from "resend";
import type { DistillResult } from "./claude";

if (!process.env.RESEND_API_KEY) {
  throw new Error(
    "RESEND_API_KEY non configurata. Aggiungi la variabile d'ambiente server-side prima di usare questo modulo."
  );
}

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function buildEmailHtml(topic: string, result: DistillResult, jobId: string): string {
  const sourcesHtml = result.sources
    .map((s) => `<li><a href="${s.url}">${s.title}</a></li>`)
    .join("\n");

  const positionsHtml = result.positions
    .map(
      (p) => `
    <div style="margin-bottom:16px;">
      <strong>${p.label}</strong> — ${p.headline}<br/>
      <span>${p.body}</span>
    </div>`
    )
    .join("\n");

  return `
<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"><title>Distillato: ${topic}</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;">Distillato: ${topic}</h1>

  <h2 style="font-size:16px;">Sintesi</h2>
  <p>${result.summary}</p>

  <h2 style="font-size:16px;">Posizioni</h2>
  ${positionsHtml}

  <h2 style="font-size:16px;">Fonti</h2>
  <ul>${sourcesHtml}</ul>

  <p style="margin-top:32px;">
    <a href="${APP_URL}/distill/${jobId}" style="background:#000;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;">
      Leggi nella app
    </a>
  </p>
</body>
</html>`;
}

export async function sendDistillEmail(
  to: string,
  topic: string,
  result: DistillResult,
  jobId: string
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Distillato: ${topic}`,
    html: buildEmailHtml(topic, result, jobId),
  });

  if (error) {
    throw new Error(`Invio email fallito: ${error.message}`);
  }
}
