/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

const mockGetTrendingTopic = jest.fn();

jest.mock("@/lib/tavily", () => ({
  getTrendingTopic: mockGetTrendingTopic,
}));

// next/server mock: NextResponse.json
jest.mock("next/server", () => ({
  NextResponse: class {
    static json(body: unknown, init?: { status?: number }) {
      const status = init?.status ?? 200;
      return {
        status,
        body,
        async json() {
          return body;
        },
      };
    }
  },
}));

import { GET } from "../../src/app/api/distill/trending/route";

const mockUser = { id: "user-1", email: "test@example.com" };

describe("GET /api/distill/trending", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockGetTrendingTopic.mockReset();
  });

  it("restituisce 401 se l'utente non è autenticato", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("restituisce 200 con il topic quando autenticato e Tavily risponde", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetTrendingTopic.mockResolvedValue("Intelligenza artificiale e lavoro");

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.topic).toBe("Intelligenza artificiale e lavoro");
  });

  it("restituisce 500 se Tavily lancia un errore", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetTrendingTopic.mockRejectedValue(new Error("Tavily API down"));

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });
});
