const mockFindMany = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateMany = jest.fn();
const mockProcessJobFull = jest.fn();

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    distillJob: {
      findMany: mockFindMany,
      update: mockUpdate,
      updateMany: mockUpdateMany,
    },
    $disconnect: jest.fn(),
  })),
}));

jest.mock("../../worker/processor", () => ({
  processJobFull: mockProcessJobFull,
}));

describe("worker/index.ts", () => {
  beforeEach(() => {
    jest.resetModules();
    mockFindMany.mockReset();
    mockUpdate.mockReset();
    mockUpdateMany.mockReset();
    mockProcessJobFull.mockReset();
  });

  describe("pollOnce", () => {
    it("non chiama updateMany se non ci sono job PENDING", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const { pollOnce } = await import("../../worker/index");
      await pollOnce();

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("elabora tutti i job PENDING trovati chiamando processJobFull per ciascuno", async () => {
      mockFindMany.mockResolvedValueOnce([
        { id: "job-1", topic: "AI", tone: "neutro" },
        { id: "job-2", topic: "Sport", tone: "neutro" },
      ]);
      mockUpdateMany.mockResolvedValue({ count: 1 });
      mockProcessJobFull.mockResolvedValue(undefined);

      const { pollOnce } = await import("../../worker/index");
      await pollOnce();

      expect(mockUpdateMany).toHaveBeenCalledTimes(2);
      expect(mockProcessJobFull).toHaveBeenCalledTimes(2);
    });
  });

  describe("processJob", () => {
    it("transizione PENDING→RUNNING, chiama processJobFull, logga DONE", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });
      mockProcessJobFull.mockResolvedValueOnce(undefined);

      const { processJob } = await import("../../worker/index");
      await processJob("job-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: "job-1", status: "PENDING" },
        data: { status: "RUNNING" },
      });
      expect(mockProcessJobFull).toHaveBeenCalledWith("job-1", expect.anything());
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("non elabora il job se updateMany non riesce a reclamarlo (count=0)", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 0 });

      const { processJob } = await import("../../worker/index");
      await processJob("job-taken");

      expect(mockProcessJobFull).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("transizione a FAILED con messaggio d'errore quando processJobFull lancia eccezione", async () => {
      mockUpdateMany.mockResolvedValueOnce({ count: 1 });
      mockProcessJobFull.mockRejectedValueOnce(new Error("errore distillazione"));
      mockUpdate.mockResolvedValueOnce({});

      const { processJob } = await import("../../worker/index");
      await processJob("job-err");

      const failedCall = mockUpdate.mock.calls[0][0];
      expect(failedCall.data.status).toBe("FAILED");
      expect(failedCall.data.result).toMatchObject({ error: expect.any(String) });
    });
  });
});
