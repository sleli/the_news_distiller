import { PrismaClient } from "@prisma/client";

const TEST_SETTINGS_ID = "test-settings-api";

let mockUser: { id: string; email: string } | null = null;

jest.mock("../../src/lib/auth", () => ({
  getCurrentUser: jest.fn().mockImplementation(() => Promise.resolve(mockUser)),
}));

const prisma = new PrismaClient();

jest.mock("../../src/lib/prisma", () => ({
  prisma,
}));

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.appSettings.deleteMany();
  await prisma.$disconnect();
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
