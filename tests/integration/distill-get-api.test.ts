import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const TEST_DB_PATH = path.join(__dirname, "test-distill-get.db");
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

beforeEach(async () => {
  await prisma.distillSource.deleteMany();
  await prisma.distillJob.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: { id: "user-1", email: "user1@example.com", passwordHash: "hash1" },
  });
  await prisma.user.create({
    data: { id: "user-2", email: "user2@example.com", passwordHash: "hash2" },
  });

  mockUser = { id: "user-1", email: "user1@example.com" };
});

describe("GET /api/distill", () => {
  it("restituisce 401 senza sessione valida", async () => {
    mockUser = null;
    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("restituisce lista vuota se non ci sono job", async () => {
    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it("restituisce i job dell'utente autenticato con i campi corretti", async () => {
    await prisma.distillJob.create({
      data: { id: "job-1", userId: "user-1", topic: "Energia solare", tone: "neutro" },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({
      id: "job-1",
      topic: "Energia solare",
      tone: "neutro",
      status: "PENDING",
    });
    expect(data[0]).toHaveProperty("createdAt");
    expect(data[0]).not.toHaveProperty("result");
    expect(data[0]).not.toHaveProperty("sources");
  });

  it("ordina i job per createdAt DESC", async () => {
    await prisma.distillJob.create({
      data: {
        id: "job-old",
        userId: "user-1",
        topic: "Vecchio",
        tone: "neutro",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    });
    await prisma.distillJob.create({
      data: {
        id: "job-new",
        userId: "user-1",
        topic: "Nuovo",
        tone: "neutro",
        createdAt: new Date("2024-06-01T00:00:00Z"),
      },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    const data = await response.json();

    expect(data[0].id).toBe("job-new");
    expect(data[1].id).toBe("job-old");
  });

  it("non restituisce job di altri utenti (isolamento cross-utente)", async () => {
    await prisma.distillJob.create({
      data: { id: "job-user2", userId: "user-2", topic: "Altro utente", tone: "neutro" },
    });

    const { GET } = await import("../../src/app/api/distill/route");
    const response = await GET();
    const data = await response.json();

    expect(data).toEqual([]);
  });
});

describe("GET /api/distill/[id]", () => {
  it("restituisce 401 senza sessione valida", async () => {
    mockUser = null;
    const { GET } = await import("../../src/app/api/distill/[id]/route");
    const request = new Request("http://localhost/api/distill/job-1");
    const response = await GET(request, { params: Promise.resolve({ id: "job-1" }) });
    expect(response.status).toBe(401);
  });

  it("restituisce 404 per job non trovato", async () => {
    const { GET } = await import("../../src/app/api/distill/[id]/route");
    const request = new Request("http://localhost/api/distill/nonexistent");
    const response = await GET(request, { params: Promise.resolve({ id: "nonexistent" }) });
    expect(response.status).toBe(404);
  });

  it("restituisce 404 per job di altro utente (no enumerazione)", async () => {
    await prisma.distillJob.create({
      data: { id: "job-user2", userId: "user-2", topic: "Privato", tone: "neutro" },
    });

    const { GET } = await import("../../src/app/api/distill/[id]/route");
    const request = new Request("http://localhost/api/distill/job-user2");
    const response = await GET(request, { params: Promise.resolve({ id: "job-user2" }) });
    expect(response.status).toBe(404);
  });

  it("restituisce il dettaglio del job con result null se non DONE", async () => {
    await prisma.distillJob.create({
      data: { id: "job-pending", userId: "user-1", topic: "In corso", tone: "analitico" },
    });

    const { GET } = await import("../../src/app/api/distill/[id]/route");
    const request = new Request("http://localhost/api/distill/job-pending");
    const response = await GET(request, { params: Promise.resolve({ id: "job-pending" }) });
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data).toMatchObject({
      id: "job-pending",
      topic: "In corso",
      tone: "analitico",
      status: "PENDING",
      result: null,
      sources: [],
    });
  });

  it("restituisce result e sources per un job DONE", async () => {
    const resultPayload = { summary: "Sintesi sull'energia", positions: [] };

    await prisma.distillJob.create({
      data: {
        id: "job-done",
        userId: "user-1",
        topic: "Energia",
        tone: "neutro",
        status: "DONE",
        result: resultPayload,
      },
    });
    await prisma.distillSource.create({
      data: {
        id: "src-1",
        jobId: "job-done",
        url: "https://example.com/article",
        title: "Articolo Energia",
        excerpt: "Estratto breve",
        position: "pro",
      },
    });

    const { GET } = await import("../../src/app/api/distill/[id]/route");
    const request = new Request("http://localhost/api/distill/job-done");
    const response = await GET(request, { params: Promise.resolve({ id: "job-done" }) });
    expect(response.status).toBe(200);
    const data = await response.json();

    expect(data.status).toBe("DONE");
    expect(data.result).toMatchObject(resultPayload);
    expect(data.sources).toHaveLength(1);
    expect(data.sources[0]).toMatchObject({
      id: "src-1",
      url: "https://example.com/article",
      title: "Articolo Energia",
      excerpt: "Estratto breve",
      position: "pro",
    });
  });
});
