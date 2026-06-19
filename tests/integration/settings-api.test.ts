import { execSync } from "child_process";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";

const TEST_DB_PATH = path.join(__dirname, "test-settings.db");
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
  await prisma.appSettings.deleteMany();
  mockUser = { id: "user-1", email: "test@example.com" };
});

function makeRequest(body?: unknown): Request {
  return new Request("http://localhost/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("GET /api/settings", () => {
  it("restituisce il default quando il record non esiste", async () => {
    const { GET } = await import("../../src/app/api/settings/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claudeMode).toBe("API_KEY");
  });

  it("restituisce il valore salvato dopo una scrittura", async () => {
    await prisma.appSettings.create({
      data: { id: "default", claudeMode: "CLI_SUBPROCESS" },
    });

    const { GET } = await import("../../src/app/api/settings/route");
    const response = await GET();
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claudeMode).toBe("CLI_SUBPROCESS");
  });

  it("restituisce 401 senza sessione valida", async () => {
    mockUser = null;
    const { GET } = await import("../../src/app/api/settings/route");
    const response = await GET();
    expect(response.status).toBe(401);
  });
});

describe("PATCH /api/settings", () => {
  it("salva claudeMode valido e restituisce 200", async () => {
    const { PATCH } = await import("../../src/app/api/settings/route");
    const response = await PATCH(makeRequest({ claudeMode: "CLI_SUBPROCESS" }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.claudeMode).toBe("CLI_SUBPROCESS");

    const saved = await prisma.appSettings.findUnique({ where: { id: "default" } });
    expect(saved?.claudeMode).toBe("CLI_SUBPROCESS");
  });

  it("restituisce 400 con valore non valido", async () => {
    const { PATCH } = await import("../../src/app/api/settings/route");
    const response = await PATCH(makeRequest({ claudeMode: "INVALID_MODE" }));
    expect(response.status).toBe(400);
  });

  it("restituisce 401 senza sessione", async () => {
    mockUser = null;
    const { PATCH } = await import("../../src/app/api/settings/route");
    const response = await PATCH(makeRequest({ claudeMode: "API_KEY" }));
    expect(response.status).toBe(401);
  });

  it("esegue upsert: aggiorna se il record esiste già", async () => {
    await prisma.appSettings.create({
      data: { id: "default", claudeMode: "API_KEY" },
    });

    const { PATCH } = await import("../../src/app/api/settings/route");
    const response = await PATCH(makeRequest({ claudeMode: "CLI_SUBPROCESS" }));
    expect(response.status).toBe(200);

    const records = await prisma.appSettings.findMany();
    expect(records).toHaveLength(1);
    expect(records[0].claudeMode).toBe("CLI_SUBPROCESS");
  });
});
