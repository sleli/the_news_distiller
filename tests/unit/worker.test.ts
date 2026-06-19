const mockFindMany = jest.fn();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    distillJob: {
      findMany: mockFindMany,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
    $disconnect: jest.fn(),
  })),
}));

describe("worker/index.ts", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFindMany.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockUpdate.mockReset();
    mockUpdateMany.mockReset();
  });

  describe("pollOnce", () => {
    it("non chiama update se non ci sono job PENDING", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const { pollOnce } = await import("../../worker/index");
      await pollOnce();

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("elabora tutti i job PENDING trovati con transizioni RUNNING→DONE", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "job-1", topic: "AI", tone: "informativo" },
        { id: "job-2", topic: "Sport", tone: "neutro" },
      ]);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockFindUniqueOrThrow
        .mockResolvedValueOnce({ id: "job-1", topic: "AI", tone: "informativo" })
        .mockResolvedValueOnce({ id: "job-2", topic: "Sport", tone: "neutro" });
      mockUpdate.mockResolvedValue({});

      const { pollOnce } = await import("../../worker/index");
      await pollOnce();

      // 2 job × 1 updateMany (RUNNING claim) + 2 job × 1 update (DONE) = 2 + 2
      expect(mockUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });

  describe("processJob", () => {
    it("transizione PENDING→RUNNING→DONE quando il claim e handleJob hanno successo", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });
      mockFindUniqueOrThrow.mockResolvedValueOnce({ id: "job-1", topic: "AI", tone: "informativo" });
      mockUpdate.mockResolvedValue({});

      const { processJob } = await import("../../worker/index");
      await processJob("job-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: "job-1", status: "PENDING" },
        data: { status: "RUNNING" },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "job-1" },
        data: { status: "DONE" },
      });
    });

    it("non elabora il job se updateMany non riesce a reclamarlo (count=0)", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 0 });

      const { processJob } = await import("../../worker/index");
      await processJob("job-taken");

      expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("transizione a FAILED con messaggio d'errore quando il job lookup fallisce", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });
      mockFindUniqueOrThrow.mockRejectedValueOnce(new Error("record non trovato"));
      mockUpdate.mockResolvedValueOnce({});

      const { processJob } = await import("../../worker/index");
      await processJob("job-err");

      const failedCall = mockUpdate.mock.calls[0][0];
      expect(failedCall.data.status).toBe("FAILED");
      expect(failedCall.data.result).toMatchObject({ error: expect.any(String) });
    });
  });
});
