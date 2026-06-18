const mockSearch = jest.fn();

jest.mock("@tavily/core", () => ({
  tavily: jest.fn(() => ({ search: mockSearch })),
}));

describe("src/lib/tavily.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, TAVILY_API_KEY: "test-key" };
    mockSearch.mockReset();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("mappa i risultati Tavily in TavilyArticle (happy path)", async () => {
    mockSearch.mockResolvedValueOnce({
      results: [
        { title: "Articolo 1", url: "https://a.com/1", content: "Testo 1" },
        { title: "Articolo 2", url: "https://a.com/2", content: "Testo 2" },
      ],
    });

    const { searchArticles } = await import("@/lib/tavily");
    const results = await searchArticles("riforma pensioni", 2);

    expect(results).toEqual([
      { title: "Articolo 1", url: "https://a.com/1", content: "Testo 1" },
      { title: "Articolo 2", url: "https://a.com/2", content: "Testo 2" },
    ]);
  });

  it("lancia un errore descrittivo se TAVILY_API_KEY non è configurata", async () => {
    delete process.env.TAVILY_API_KEY;

    await expect(import("@/lib/tavily")).rejects.toThrow("TAVILY_API_KEY");
  });

  it("passa n come maxResults alla chiamata Tavily", async () => {
    mockSearch.mockResolvedValueOnce({ results: [] });

    const { searchArticles } = await import("@/lib/tavily");
    await searchArticles("clima", 7);

    expect(mockSearch).toHaveBeenCalledWith(
      "clima",
      expect.objectContaining({ maxResults: 7 })
    );
  });

  it("usa stringa vuota come fallback per content null/undefined", async () => {
    mockSearch.mockResolvedValueOnce({
      results: [
        { title: "A", url: "https://b.com", content: null },
        { title: "B", url: "https://c.com", content: undefined },
      ],
    });

    const { searchArticles } = await import("@/lib/tavily");
    const results = await searchArticles("test", 2);

    expect(results[0].content).toBe("");
    expect(results[1].content).toBe("");
  });
});
