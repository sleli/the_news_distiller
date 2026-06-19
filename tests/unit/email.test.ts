const mockSend = jest.fn();
const mockResendConstructor = jest.fn(() => ({
  emails: { send: mockSend },
}));

jest.mock("resend", () => ({
  Resend: mockResendConstructor,
}));

import type { DistillResult } from "@/lib/claude";

const MOCK_RESULT: DistillResult = {
  summary: "Sintesi di test",
  positions: [
    {
      label: "Posizione A",
      headline: "Titolo A",
      body: "Corpo A",
      sourceRefs: ["1"],
    },
  ],
  sources: [{ title: "Fonte 1", url: "https://example.com/1" }],
};

describe("src/lib/email.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, RESEND_API_KEY: "test-resend-key" };
    mockSend.mockReset();
    mockResendConstructor.mockClear();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it("happy path — chiama resend.emails.send con i parametri corretti", async () => {
    mockSend.mockResolvedValueOnce({ data: { id: "email-id-1" }, error: null });

    const { sendDistillEmail } = await import("@/lib/email");
    await sendDistillEmail("user@example.com", "riforma pensioni", MOCK_RESULT, "job-123");

    expect(mockSend).toHaveBeenCalledTimes(1);
    const callArgs = mockSend.mock.calls[0][0];
    expect(callArgs.to).toBe("user@example.com");
    expect(callArgs.subject).toBe("Distillato: riforma pensioni");
    expect(callArgs.html).toContain("Sintesi di test");
    expect(callArgs.html).toContain("https://example.com/1");
    expect(callArgs.html).toContain("/distill/job-123");
    expect(callArgs.html).toContain("Leggi nella app");
  });

  it("errore SDK — propaga un Error con messaggio descrittivo", async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: "Invalid API key" } });

    const { sendDistillEmail } = await import("@/lib/email");
    await expect(
      sendDistillEmail("user@example.com", "topic", MOCK_RESULT, "job-456")
    ).rejects.toThrow("Invio email fallito: Invalid API key");
  });

  it("chiave mancante — lancia un errore all'import se RESEND_API_KEY non è configurata", async () => {
    delete process.env.RESEND_API_KEY;

    await expect(import("@/lib/email")).rejects.toThrow("RESEND_API_KEY");
  });
});
