import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TEST_PREFIX = "test-pg-crud-";

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.distillSource.deleteMany({
    where: { job: { topic: { startsWith: TEST_PREFIX } } },
  });
  await prisma.distillJob.deleteMany({
    where: { topic: { startsWith: TEST_PREFIX } },
  });
  await prisma.session.deleteMany({
    where: { user: { email: { startsWith: TEST_PREFIX } } },
  });
  await prisma.user.deleteMany({
    where: { email: { startsWith: TEST_PREFIX } },
  });
  await prisma.appSettings.deleteMany({
    where: { id: { startsWith: TEST_PREFIX } },
  });
  await prisma.$disconnect();
});

describe("PostgreSQL CRUD — User", () => {
  const email = `${TEST_PREFIX}user@example.com`;

  it("crea un utente", async () => {
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash123", name: "Test User" },
    });
    expect(user.id).toBeDefined();
    expect(user.email).toBe(email);
  });

  it("legge un utente per email", async () => {
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).not.toBeNull();
    expect(user!.name).toBe("Test User");
  });

  it("aggiorna un utente", async () => {
    const user = await prisma.user.update({
      where: { email },
      data: { name: "Updated User" },
    });
    expect(user.name).toBe("Updated User");
  });

  it("elimina un utente", async () => {
    await prisma.user.delete({ where: { email } });
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();
  });
});

describe("PostgreSQL CRUD — Session", () => {
  const email = `${TEST_PREFIX}session@example.com`;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash123" },
    });
    userId = user.id;
  });

  it("crea una sessione", async () => {
    const session = await prisma.session.create({
      data: {
        userId,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    sessionId = session.id;
    expect(session.userId).toBe(userId);
  });

  it("legge una sessione", async () => {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    expect(session).not.toBeNull();
    expect(session!.userId).toBe(userId);
  });

  it("elimina una sessione", async () => {
    await prisma.session.delete({ where: { id: sessionId } });
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    expect(session).toBeNull();
  });
});

describe("PostgreSQL CRUD — DistillJob + DistillSource", () => {
  const email = `${TEST_PREFIX}job@example.com`;
  let userId: string;
  let jobId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email, passwordHash: "hash123" },
    });
    userId = user.id;
  });

  it("crea un distill job", async () => {
    const job = await prisma.distillJob.create({
      data: {
        userId,
        topic: `${TEST_PREFIX}tech news`,
        tone: "professional",
      },
    });
    jobId = job.id;
    expect(job.status).toBe("PENDING");
  });

  it("aggiorna lo stato di un job", async () => {
    const job = await prisma.distillJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", result: { summary: "test result" } },
    });
    expect(job.status).toBe("COMPLETED");
  });

  it("crea una distill source", async () => {
    const source = await prisma.distillSource.create({
      data: {
        jobId,
        url: "https://example.com",
        title: "Test Source",
        excerpt: "Test excerpt",
        position: "pro",
      },
    });
    expect(source.jobId).toBe(jobId);
  });

  it("legge job con sources", async () => {
    const job = await prisma.distillJob.findUnique({
      where: { id: jobId },
      include: { sources: true },
    });
    expect(job!.sources).toHaveLength(1);
    expect(job!.sources[0].title).toBe("Test Source");
  });

  it("cascade delete rimuove sources quando il job viene eliminato", async () => {
    await prisma.distillJob.delete({ where: { id: jobId } });
    const sources = await prisma.distillSource.findMany({
      where: { jobId },
    });
    expect(sources).toHaveLength(0);
  });
});

describe("PostgreSQL CRUD — AppSettings", () => {
  const settingsId = `${TEST_PREFIX}settings`;

  it("crea app settings", async () => {
    const settings = await prisma.appSettings.create({
      data: { id: settingsId, claudeMode: "API_KEY" },
    });
    expect(settings.claudeMode).toBe("API_KEY");
  });

  it("aggiorna app settings", async () => {
    const settings = await prisma.appSettings.update({
      where: { id: settingsId },
      data: { claudeMode: "BYOK" },
    });
    expect(settings.claudeMode).toBe("BYOK");
  });

  it("legge app settings", async () => {
    const settings = await prisma.appSettings.findUnique({
      where: { id: settingsId },
    });
    expect(settings!.claudeMode).toBe("BYOK");
  });
});
