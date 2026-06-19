import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import type { TavilyArticle } from "../../src/lib/tavily";
import type { DistillResult } from "../../src/lib/claude";
import { sendDistillEmail } from "../../src/lib/email";

const TEST_DB_PATH = path.join(__dirname, "test-integration.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

const FIXTURE_ARTICLES: TavilyArticle[] = [
  { title: "Articolo A", url: "https://example.com/a", content: "Contenuto A" },
  { title: "Articolo B", url: "https://example.com/b", content: "Contenuto B" },
  { title: "Articolo C", url: "https://example.com/c", content: "Contenuto C" },
];

const FIXTURE_RESULT: DistillResult = {
  summary: "Sintesi integrazione",
  positions: [
    {
      label: "posizione-x",
      headline: "Titolo X",
      body: "Corpo X",
      sourceRefs: ["https://example.com/a"],
    },
  ],
  sources: [{ title: "Articolo A", url: "https://example.com/a" }],
};

jest.mock("../../src/lib/tavily", () => ({
  searchArticles: jest.fn().mockResolvedValue(FIXTURE_ARTICLES),
}));
jest.mock("../../src/lib/claude", () => ({
  distillArticles: jest.fn().mockResolvedValue(FIXTURE_RESULT),
}));
jest.mock("../../src/lib/email", () => ({
  sendDistillEmail: jest.fn().mockResolvedValue(undefined),
}));

let prisma: PrismaClient;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  process.env.DATABASE_URL = TEST_DB_URL;

  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe("integrazione: pollOnce → processJob → DONE", () => {
  it("ciclo completo: job PENDING diventa DONE con DistillSource persistiti", async () => {
    const user = await prisma.user.create({
      data: {
        email: "integration@test.com",
        passwordHash: "hash",
        name: "Test User",
      },
    });

    const job = await prisma.distillJob.create({
      data: {
        userId: user.id,
        topic: "Test Topic",
        tone: "neutro",
        status: "PENDING",
      },
    });

    const { pollOnce } = await import("../../worker/index");

    await pollOnce();

    const updatedJob = await prisma.distillJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.status).toBe("DONE");
    expect(updatedJob?.result).not.toBeNull();

    const sourceCount = await prisma.distillSource.count({ where: { jobId: job.id } });
    expect(sourceCount).toBe(FIXTURE_ARTICLES.length);
  });
});

describe("integrazione: errore email non impatta lo status del job", () => {
  it("job diventa DONE anche quando sendDistillEmail lancia eccezione", async () => {
    (sendDistillEmail as jest.Mock).mockRejectedValueOnce(new Error("Resend error"));

    const user = await prisma.user.create({
      data: {
        email: "integration-email-err@test.com",
        passwordHash: "hash",
        name: "Test User Email Err",
      },
    });

    const job = await prisma.distillJob.create({
      data: {
        userId: user.id,
        topic: "Email Error Topic",
        tone: "neutro",
        status: "PENDING",
      },
    });

    const { pollOnce } = await import("../../worker/index");
    await pollOnce();

    const updatedJob = await prisma.distillJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.status).toBe("DONE");
  });
});

describe("integrazione: recoverStuckJobs reimposta job RUNNING bloccati", () => {
  it("job RUNNING con updatedAt oltre soglia viene impostato a FAILED", async () => {
    const user = await prisma.user.create({
      data: {
        email: "integration-stuck@test.com",
        passwordHash: "hash",
        name: "Test User Stuck",
      },
    });

    const job = await prisma.distillJob.create({
      data: {
        userId: user.id,
        topic: "Stuck Job Topic",
        tone: "neutro",
        status: "RUNNING",
      },
    });

    // Simulate being 11 minutes in the future so the job (created "now") appears stuck
    const realNow = Date.now();
    jest.spyOn(Date, "now").mockReturnValue(realNow + 11 * 60 * 1000);

    const { pollOnce } = await import("../../worker/index");
    await pollOnce();

    jest.restoreAllMocks();

    const updatedJob = await prisma.distillJob.findUnique({ where: { id: job.id } });
    expect(updatedJob?.status).toBe("FAILED");
  });
});
