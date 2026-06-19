import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import type { TavilyArticle } from "../../src/lib/tavily";
import type { DistillResult } from "../../src/lib/claude";

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
