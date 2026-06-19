import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.join(__dirname, "test-distill-get-archive.db");
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

let mockUser: { id: string; email: string } | null = null;

jest.mock("../../src/lib/auth", () => ({
  getCurrentUser: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
}));

jest.mock("../../src/lib/prisma", () => {
  const { PrismaClient } = jest.requireActual("@prisma/client");
  const client = new PrismaClient({
    datasources: { db: { url: TEST_DB_URL } },
  });
  return { prisma: client };
});

let prisma: PrismaClient;

beforeAll(async () => {
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

  process.env.DATABASE_URL = TEST_DB_URL;
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: "pipe",
  });

  prisma = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
});

afterAll(async () => {
  await prisma.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
});

beforeEach(async () => {
  await prisma.distillSource.deleteMany();
  await prisma.distillJob.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { id: "user-1", email: "user1@example.com", passwordHash: "hash1" },
  });

  mockUser = { id: "user-1", email: "user1@example.com" };
});

describe("GET /api/distill — snippet e contatori (US-020)", () => {
  it("restituisce 401 senza sessione valida", async () => {
    mockUser = null;
    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("job DONE: snippet, sourceCount e positionCount presenti", async () => {
    const summary = "Sintesi sull'intelligenza artificiale e il suo impatto sul lavoro in Italia.";
    await prisma.distillJob.create({
      data: {
        id: "job-done",
        userId: "user-1",
        topic: "IA e lavoro",
        tone: "neutro",
        status: "DONE",
        result: { summary, positions: [] },
      },
    });
    await prisma.distillSource.create({
      data: { id: "src-1", jobId: "job-done", url: "https://a.it", title: "A", excerpt: "x", position: "pro" },
    });
    await prisma.distillSource.create({
      data: { id: "src-2", jobId: "job-done", url: "https://b.it", title: "B", excerpt: "y", position: "contro" },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    const job = data.find((j: { id: string }) => j.id === "job-done");

    expect(job.snippet).toBeTruthy();
    expect(job.sourceCount).toBe(2);
    expect(job.positionCount).toBe(2);
  });

  it("job DONE con summary > 120 char: snippet è troncato con ellissi", async () => {
    const longSummary = "A".repeat(200);
    await prisma.distillJob.create({
      data: {
        id: "job-long",
        userId: "user-1",
        topic: "Lungo",
        tone: "neutro",
        status: "DONE",
        result: { summary: longSummary, positions: [] },
      },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    const data = await response.json();
    const job = data.find((j: { id: string }) => j.id === "job-long");

    expect(job.snippet).toHaveLength(121); // 120 + "…"
    expect(job.snippet).toMatch(/…$/);
  });

  it("job PENDING: snippet, sourceCount e positionCount sono null", async () => {
    await prisma.distillJob.create({
      data: { id: "job-pending", userId: "user-1", topic: "In coda", tone: "neutro", status: "PENDING" },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    const data = await response.json();
    const job = data.find((j: { id: string }) => j.id === "job-pending");

    expect(job.snippet).toBeNull();
    expect(job.sourceCount).toBeNull();
    expect(job.positionCount).toBeNull();
  });

  it("job DONE con result JSON malformato: campi null senza errore 500", async () => {
    await prisma.distillJob.create({
      data: {
        id: "job-bad",
        userId: "user-1",
        topic: "Malformato",
        tone: "neutro",
        status: "DONE",
        result: { noSummaryField: true },
      },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    const job = data.find((j: { id: string }) => j.id === "job-bad");

    expect(job.snippet).toBeNull();
  });
});
