import { PrismaClient } from "@prisma/client";
import { processJobFull } from "./processor";

const prisma = new PrismaClient();

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);

export async function processJob(jobId: string): Promise<void> {
  const claimed = await prisma.distillJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: { status: "RUNNING" },
  });
  if (claimed.count === 0) return; // già preso da un altro worker

  try {
    await processJobFull(jobId, prisma);
    console.log(`[worker] job ${jobId} → DONE`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.distillJob.update({
      where: { id: jobId },
      data: { status: "FAILED", result: { error: message } },
    });
    console.error(`[worker] job ${jobId} → FAILED: ${message}`);
  }
}

export async function pollOnce(): Promise<void> {
  const pendingJobs = await prisma.distillJob.findMany({ where: { status: "PENDING" } });
  if (pendingJobs.length === 0) {
    console.log("[worker] nessun job PENDING");
    return;
  }
  console.log(`[worker] trovati ${pendingJobs.length} job PENDING`);
  for (const job of pendingJobs) {
    await processJob(job.id);
  }
}

async function main(): Promise<void> {
  console.log(`[worker] avviato — polling ogni ${POLL_INTERVAL_MS}ms`);
  const timer = setInterval(async () => {
    try {
      await pollOnce();
    } catch (err) {
      console.error("[worker] errore ciclo di polling:", err);
    }
  }, POLL_INTERVAL_MS);

  const shutdown = async () => {
    console.log("[worker] shutdown in corso...");
    clearInterval(timer);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

if (require.main === module) {
  main();
}
