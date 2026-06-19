import { PrismaClient } from "@prisma/client";
import { searchArticles } from "../src/lib/tavily";
import { distillArticles } from "../src/lib/claude";
import type { ToneKey } from "../src/lib/tones";
import { sendDistillEmail } from "../src/lib/email";

const TAVILY_MAX_RESULTS = Number(process.env.TAVILY_MAX_RESULTS ?? 10);

export async function processJobFull(jobId: string, prisma: PrismaClient): Promise<void> {
  const job = await prisma.distillJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { user: true },
  });

  const articles = await searchArticles(job.topic, TAVILY_MAX_RESULTS);

  if (articles.length === 0) {
    throw new Error(`Nessun articolo trovato per il topic "${job.topic}"`);
  }

  const result = await distillArticles(articles, job.topic, job.tone as ToneKey);

  await prisma.distillJob.update({
    where: { id: jobId },
    data: { status: "DONE", result: result as object },
  });

  const sourceData = articles.map((article) => {
    const matchingPosition = result.positions.find((p) =>
      p.sourceRefs.some((ref) => ref.includes(article.url) || article.url.includes(ref))
    );
    return {
      jobId,
      url: article.url,
      title: article.title,
      excerpt: article.content.substring(0, 500),
      position: matchingPosition?.label ?? "generale",
    };
  });

  await prisma.distillSource.createMany({ data: sourceData });

  try {
    await sendDistillEmail(job.user.email, job.topic, result, jobId);
  } catch (err) {
    console.error(`[processor] errore invio email per job ${jobId}:`, err);
  }
}
