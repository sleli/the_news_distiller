import type { TavilyArticle } from "../../src/lib/tavily";
import type { DistillResult } from "../../src/lib/claude";

const mockSearchArticles = jest.fn<Promise<TavilyArticle[]>, [string, number]>();
const mockDistillArticles = jest.fn<Promise<DistillResult>, [TavilyArticle[], string, string]>();
const mockSendDistillEmail = jest.fn<Promise<void>, [string, string, DistillResult, string]>();
const mockFindUniqueOrThrow = jest.fn();
const mockUpdate = jest.fn();
const mockCreateMany = jest.fn();

jest.mock("../../src/lib/tavily", () => ({ searchArticles: mockSearchArticles }));
jest.mock("../../src/lib/claude", () => ({ distillArticles: mockDistillArticles }));
jest.mock("../../src/lib/email", () => ({ sendDistillEmail: mockSendDistillEmail }));

const mockPrisma = {
  distillJob: {
    findUniqueOrThrow: mockFindUniqueOrThrow,
    update: mockUpdate,
  },
  distillSource: {
    createMany: mockCreateMany,
  },
} as never;

const FIXTURE_ARTICLES: TavilyArticle[] = [
  { title: "Articolo 1", url: "https://example.com/art1", content: "Contenuto articolo 1" },
  { title: "Articolo 2", url: "https://example.com/art2", content: "Contenuto articolo 2" },
  { title: "Articolo 3", url: "https://example.com/art3", content: "Contenuto articolo 3" },
];

const FIXTURE_RESULT: DistillResult = {
  summary: "Sintesi di test",
  positions: [
    {
      label: "posizione-a",
      headline: "Titolo A",
      body: "Corpo A",
      sourceRefs: ["https://example.com/art1"],
    },
    {
      label: "posizione-b",
      headline: "Titolo B",
      body: "Corpo B",
      sourceRefs: ["https://example.com/art2"],
    },
  ],
  sources: [
    { title: "Articolo 1", url: "https://example.com/art1" },
    { title: "Articolo 2", url: "https://example.com/art2" },
  ],
};

const FIXTURE_JOB = {
  id: "job-abc",
  topic: "Intelligenza Artificiale",
  tone: "neutro",
  user: { id: "user-1", email: "utente@test.com" },
};

describe("worker/processor.ts — processJobFull", () => {
  beforeEach(() => {
    jest.resetModules();
    mockSearchArticles.mockReset();
    mockDistillArticles.mockReset();
    mockSendDistillEmail.mockReset();
    mockFindUniqueOrThrow.mockReset();
    mockUpdate.mockReset();
    mockCreateMany.mockReset();
  });

  describe("happy path", () => {
    it("chiama searchArticles, distillArticles, aggiorna DONE, persiste DistillSource, invia email", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce(FIXTURE_ARTICLES);
      mockDistillArticles.mockResolvedValueOnce(FIXTURE_RESULT);
      mockUpdate.mockResolvedValueOnce({});
      mockCreateMany.mockResolvedValueOnce({ count: FIXTURE_ARTICLES.length });
      mockSendDistillEmail.mockResolvedValueOnce(undefined);

      const { processJobFull } = await import("../../worker/processor");
      await processJobFull("job-abc", mockPrisma);

      expect(mockSearchArticles).toHaveBeenCalledWith(
        FIXTURE_JOB.topic,
        expect.any(Number)
      );
      expect(mockDistillArticles).toHaveBeenCalledWith(
        FIXTURE_ARTICLES,
        FIXTURE_JOB.topic,
        FIXTURE_JOB.tone
      );
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "job-abc" },
        data: { status: "DONE", result: FIXTURE_RESULT },
      });
      expect(mockCreateMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ jobId: "job-abc", url: expect.any(String) }),
        ]),
      });
      expect(mockCreateMany.mock.calls[0][0].data).toHaveLength(FIXTURE_ARTICLES.length);
      expect(mockSendDistillEmail).toHaveBeenCalledWith(
        FIXTURE_JOB.user.email,
        FIXTURE_JOB.topic,
        FIXTURE_RESULT,
        "job-abc"
      );
    });
  });

  describe("mapping position", () => {
    it("assegna la label della position quando l'URL è in sourceRefs, 'generale' altrimenti", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce(FIXTURE_ARTICLES);
      mockDistillArticles.mockResolvedValueOnce(FIXTURE_RESULT);
      mockUpdate.mockResolvedValueOnce({});
      mockCreateMany.mockResolvedValueOnce({ count: FIXTURE_ARTICLES.length });
      mockSendDistillEmail.mockResolvedValueOnce(undefined);

      const { processJobFull } = await import("../../worker/processor");
      await processJobFull("job-abc", mockPrisma);

      const sourceData = mockCreateMany.mock.calls[0][0].data as Array<{
        url: string;
        position: string;
      }>;

      const art1 = sourceData.find((s) => s.url === "https://example.com/art1");
      const art2 = sourceData.find((s) => s.url === "https://example.com/art2");
      const art3 = sourceData.find((s) => s.url === "https://example.com/art3");

      expect(art1?.position).toBe("posizione-a");
      expect(art2?.position).toBe("posizione-b");
      expect(art3?.position).toBe("generale");
    });
  });

  describe("caso errore: searchArticles ritorna array vuoto", () => {
    it("lancia Error con il topic nel messaggio e non chiama distillArticles", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce([]);

      const { processJobFull } = await import("../../worker/processor");
      await expect(processJobFull("job-abc", mockPrisma)).rejects.toThrow(
        FIXTURE_JOB.topic
      );

      expect(mockDistillArticles).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("caso errore: distillArticles lancia eccezione", () => {
    it("propaga l'errore senza aggiornare il job", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce(FIXTURE_ARTICLES);
      mockDistillArticles.mockRejectedValueOnce(new Error("Claude non disponibile"));

      const { processJobFull } = await import("../../worker/processor");
      await expect(processJobFull("job-abc", mockPrisma)).rejects.toThrow(
        "Claude non disponibile"
      );

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreateMany).not.toHaveBeenCalled();
    });
  });

  describe("caso errore: sendDistillEmail lancia eccezione", () => {
    it("processJobFull risolve senza eccezione, job aggiornato DONE, createMany chiamato, errore loggato", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce(FIXTURE_ARTICLES);
      mockDistillArticles.mockResolvedValueOnce(FIXTURE_RESULT);
      mockUpdate.mockResolvedValueOnce({});
      mockCreateMany.mockResolvedValueOnce({ count: FIXTURE_ARTICLES.length });
      mockSendDistillEmail.mockRejectedValueOnce(new Error("Resend error"));

      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      const { processJobFull } = await import("../../worker/processor");
      await expect(processJobFull("job-abc", mockPrisma)).resolves.toBeUndefined();

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "job-abc" },
        data: { status: "DONE", result: FIXTURE_RESULT },
      });
      expect(mockCreateMany).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("errore invio email"),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("caso errore: distillArticles lancia errore di validazione payload", () => {
    it("propaga l'errore di validazione senza chiamare prisma.distillJob.update né prisma.distillSource.createMany", async () => {
      mockFindUniqueOrThrow.mockResolvedValueOnce(FIXTURE_JOB);
      mockSearchArticles.mockResolvedValueOnce(FIXTURE_ARTICLES);
      mockDistillArticles.mockRejectedValueOnce(
        new Error('Payload Claude non valido: {"summary":null,"positions":[],"sources":[]}')
      );

      const { processJobFull } = await import("../../worker/processor");
      await expect(processJobFull("job-abc", mockPrisma)).rejects.toThrow(
        "Payload Claude non valido"
      );

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockCreateMany).not.toHaveBeenCalled();
    });
  });
});
