/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();

jest.mock("@/lib/auth", () => ({
  getCurrentUser: mockGetCurrentUser,
}));

const mockFindUnique = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    distillJob: {
      findUnique: mockFindUnique,
      delete: mockDelete,
    },
  },
}));

// next/server mock: NextResponse.json e new NextResponse(null, { status })
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
    constructor(_body: null, init?: { status?: number }) {
      return { status: init?.status ?? 200, body: null };
    }
  },
}));

import { DELETE } from "../../src/app/api/distill/[id]/route";

const mockUser = { id: "user-1", email: "test@example.com" };

describe("DELETE /api/distill/[id]", () => {
  beforeEach(() => {
    mockGetCurrentUser.mockReset();
    mockFindUnique.mockReset();
    mockDelete.mockReset();
  });

  it("restituisce 401 se l'utente non è autenticato", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/distill/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    });

    expect(response.status).toBe(401);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("restituisce 404 se il job non esiste", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost/api/distill/job-999"), {
      params: Promise.resolve({ id: "job-999" }),
    });

    expect(response.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("restituisce 404 se il job appartiene a un altro utente", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue({ id: "job-2", userId: "user-99" });

    const response = await DELETE(new Request("http://localhost/api/distill/job-2"), {
      params: Promise.resolve({ id: "job-2" }),
    });

    expect(response.status).toBe(404);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("restituisce 204 e chiama prisma.distillJob.delete su delete valido", async () => {
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFindUnique.mockResolvedValue({ id: "job-1", userId: "user-1" });
    mockDelete.mockResolvedValue({});

    const response = await DELETE(new Request("http://localhost/api/distill/job-1"), {
      params: Promise.resolve({ id: "job-1" }),
    });

    expect(response.status).toBe(204);
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });
});
