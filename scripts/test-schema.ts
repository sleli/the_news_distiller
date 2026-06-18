import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clean up any leftover test data
  await prisma.distillSource.deleteMany({});
  await prisma.distillJob.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.user.deleteMany({ where: { email: "test-schema@example.com" } });

  console.log("--- Test 1: Create User → DistillJob → DistillSource ---");

  const user = await prisma.user.create({
    data: {
      email: "test-schema@example.com",
      passwordHash: "hashed",
      name: "Test User",
    },
  });
  console.log("  User created:", user.id);

  const job = await prisma.distillJob.create({
    data: {
      userId: user.id,
      topic: "AI in healthcare",
      tone: "neutral",
      status: "PENDING",
    },
  });
  console.log("  DistillJob created:", job.id);

  // Verify default fields
  if (job.status !== "PENDING") throw new Error("status default should be PENDING");
  if (job.result !== null) throw new Error("result should be null by default");
  if (!job.createdAt) throw new Error("createdAt should exist");
  if (!job.updatedAt) throw new Error("updatedAt should exist");
  console.log("  DistillJob fields verified");

  const source = await prisma.distillSource.create({
    data: {
      jobId: job.id,
      url: "https://example.com/article",
      title: "AI Transforms Healthcare",
      excerpt: "A brief excerpt from the article.",
      position: "1",
    },
  });
  console.log("  DistillSource created:", source.id);

  // Verify all DistillSource fields
  if (source.url !== "https://example.com/article") throw new Error("url mismatch");
  if (source.title !== "AI Transforms Healthcare") throw new Error("title mismatch");
  if (source.excerpt !== "A brief excerpt from the article.") throw new Error("excerpt mismatch");
  if (source.position !== "1") throw new Error("position mismatch");
  console.log("  DistillSource fields verified");

  console.log("--- Test 2: Verify relations with include ---");

  const jobWithSources = await prisma.distillJob.findUnique({
    where: { id: job.id },
    include: { sources: true, user: true },
  });

  if (!jobWithSources) throw new Error("Job not found with include");
  if (jobWithSources.sources.length !== 1) throw new Error("Expected 1 source");
  if (jobWithSources.user.id !== user.id) throw new Error("User relation mismatch");
  if (jobWithSources.sources[0].id !== source.id) throw new Error("Source relation mismatch");
  console.log("  Relations verified: job.sources.length =", jobWithSources.sources.length);

  const userWithJobs = await prisma.user.findUnique({
    where: { id: user.id },
    include: { distillJobs: { include: { sources: true } } },
  });

  if (!userWithJobs) throw new Error("User not found with include");
  if (userWithJobs.distillJobs.length !== 1) throw new Error("Expected 1 job");
  if (userWithJobs.distillJobs[0].sources.length !== 1) throw new Error("Expected 1 source in nested include");
  console.log("  Nested relations verified: user.distillJobs[0].sources.length =", userWithJobs.distillJobs[0].sources.length);

  console.log("--- Test 3: Cascade delete DistillSource when job deleted ---");

  const job2 = await prisma.distillJob.create({
    data: {
      userId: user.id,
      topic: "Climate change",
      tone: "formal",
    },
  });

  await prisma.distillSource.create({
    data: {
      jobId: job2.id,
      url: "https://example.com/climate",
      title: "Climate News",
      excerpt: "Climate excerpt.",
      position: "1",
    },
  });

  await prisma.distillJob.delete({ where: { id: job2.id } });

  const orphanedSources = await prisma.distillSource.findMany({
    where: { jobId: job2.id },
  });
  if (orphanedSources.length !== 0) throw new Error("Sources should be cascade deleted with job");
  console.log("  Cascade delete of DistillSource on job delete: PASS");

  console.log("--- Test 4: Cascade delete DistillJob when user deleted ---");

  // At this point user has 1 remaining job (job) with 1 source
  await prisma.user.delete({ where: { id: user.id } });

  const orphanedJobs = await prisma.distillJob.findMany({
    where: { userId: user.id },
  });
  if (orphanedJobs.length !== 0) throw new Error("Jobs should be cascade deleted with user");

  const allOrphanedSources = await prisma.distillSource.findMany({
    where: { jobId: job.id },
  });
  if (allOrphanedSources.length !== 0) throw new Error("Sources should be cascade deleted transitively with user");
  console.log("  Cascade delete of DistillJob (and DistillSource) on user delete: PASS");

  console.log("\nAll tests PASSED.");
}

main()
  .catch((e) => {
    console.error("TEST FAILED:", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
