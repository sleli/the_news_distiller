const mockCreate = jest.fn();
const mockAnthropicConstructor = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: mockAnthropicConstructor,
}));

const mockFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    appSettings: {
      findUnique: mockFindUnique,
    },
  },
}));

const mockSpawn = jest.fn();

jest.mock("child_process", () => ({
  spawn: mockSpawn,
}));

import { EventEmitter } from "events";
import { TONE_INSTRUCTIONS } from "@/lib/tones";

// Helper to build a fake spawn process
function fakeProcess(opts: {
  stdoutData?: string;
  stderrData?: string;
  exitCode?: number;
  errorEvent?: NodeJS.ErrnoException;
}) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    stdin: { write: jest.Mock; end: jest.Mock };
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.stdin = { write: jest.fn(), end: jest.fn() };

  process.nextTick(() => {
    if (opts.errorEvent) {
      proc.emit("error", opts.errorEvent);
      return;
    }
    if (opts.stdoutData !== undefined) {
      proc.stdout.emit("data", Buffer.from(opts.stdoutData));
    }
    if (opts.stderrData) {
      proc.stderr.emit("data", Buffer.from(opts.stderrData));
    }
    proc.emit("close", opts.exitCode ?? 0);
  });

  return proc;
}

const VALID_DISTILL_RESULT = {
  summary: "Sintesi di test",
  positions: [
    {
      label: "Posizione A",
      headline: "Titolo posizione",
      body: "Corpo posizione",
      sourceRefs: ["1"],
    },
  ],
  sources: [{ title: "Fonte 1", url: "https://example.com/1" }],
};

const SAMPLE_ARTICLES = [
  { title: "Articolo 1", url: "https://example.com/1", content: "Contenuto 1" },
];

describe("src/lib/claude.ts", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV, ANTHROPIC_API_KEY: "test-key" };
    mockCreate.mockReset();
    mockAnthropicConstructor.mockClear();
    mockFindUnique.mockReset();
    mockSpawn.mockReset();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── TASK-05: modalità API_KEY ─────────────────────────────────────────────

  describe("modalità API_KEY", () => {
    it("happy path — restituisce DistillResult valido da un tool_use block", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "API_KEY" });
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_01",
            name: "extract_distillation",
            input: VALID_DISTILL_RESULT,
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "riforma pensioni", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it("fallback AppSettings null — usa API_KEY quando il record non esiste", async () => {
      mockFindUnique.mockResolvedValueOnce(null);
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_02",
            name: "extract_distillation",
            input: VALID_DISTILL_RESULT,
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "topic", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it("parametrizzazione tono — il system prompt contiene l'istruzione del tono richiesto", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "API_KEY" });
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_03",
            name: "extract_distillation",
            input: VALID_DISTILL_RESULT,
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      await distillArticles(SAMPLE_ARTICLES, "test topic", "analitico");

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.system).toContain(TONE_INSTRUCTIONS["analitico"]);
    });

    it("chiave mancante — lancia un errore API_KEY se ANTHROPIC_API_KEY non è configurata", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "API_KEY" });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("tool use assente — lancia un errore se la risposta non contiene un tool_use block", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "API_KEY" });
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Risposta in testo libero" }],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "critico")
      ).rejects.toThrow("tool_use");
    });
  });

  // ── TASK-06: modalità CLI_SUBPROCESS ─────────────────────────────────────

  describe("modalità CLI_SUBPROCESS", () => {
    it("happy path — invoca spawn e parsa lo stdout come DistillResult", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: JSON.stringify(VALID_DISTILL_RESULT) })
      );

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "riforma pensioni", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockSpawn).toHaveBeenCalledWith("claude", ["-p"], expect.any(Object));
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("scrive il prompt su stdin e chiude il pipe", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      const proc = fakeProcess({ stdoutData: JSON.stringify(VALID_DISTILL_RESULT) });
      mockSpawn.mockReturnValueOnce(proc);

      const { distillArticles } = await import("@/lib/claude");
      await distillArticles(SAMPLE_ARTICLES, "topic", "neutro");

      expect(proc.stdin.write).toHaveBeenCalledTimes(1);
      expect(proc.stdin.end).toHaveBeenCalledTimes(1);
    });

    it("ENOENT — lancia ClaudeCliNotFoundError con messaggio descrittivo", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      const enoentError = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
      mockSpawn.mockReturnValueOnce(fakeProcess({ errorEvent: enoentError }));

      const { distillArticles, ClaudeCliNotFoundError } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toBeInstanceOf(ClaudeCliNotFoundError);
    });

    it("ENOENT — il messaggio di errore menziona il PATH e la CLI", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      const enoentError = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
      mockSpawn.mockReturnValueOnce(fakeProcess({ errorEvent: enoentError }));

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/PATH/);
    });

    it("exit code non-zero — lancia un errore generico", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: "", stderrData: "fatal error", exitCode: 1 })
      );

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/codice 1/);
    });

    it("stdout non-JSON — lancia un errore di parsing", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      mockSpawn.mockReturnValueOnce(fakeProcess({ stdoutData: "testo non JSON" }));

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/parsare/);
    });

    it("stdout JSON invalido rispetto allo schema — lancia un errore di validazione", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "CLI_SUBPROCESS" });
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: JSON.stringify({ summary: "", positions: [], sources: [] }) })
      );

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/Payload Claude non valido/);
    });
  });

  // ── validateDistillResult (invariante tra modalità) ───────────────────────

  describe("validateDistillResult", () => {
    const VALID_PAYLOAD = {
      summary: "Sintesi valida",
      positions: [
        {
          label: "pos-a",
          headline: "Titolo A",
          body: "Corpo A",
          sourceRefs: ["ref-1"],
        },
      ],
      sources: [{ title: "Fonte 1", url: "https://example.com/1" }],
    };

    it("payload valido completo — ritorna DistillResult senza errori", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(validateDistillResult(VALID_PAYLOAD)).toEqual(VALID_PAYLOAD);
    });

    it("summary mancante — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = { ...VALID_PAYLOAD, summary: undefined };
      expect(() => validateDistillResult(payload)).toThrow();
    });

    it("posizione con sourceRefs vuoto — lancia Error con frammento JSON nel messaggio", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = {
        ...VALID_PAYLOAD,
        positions: [{ ...VALID_PAYLOAD.positions[0], sourceRefs: [] }],
      };
      expect(() => validateDistillResult(payload)).toThrow(/sourceRefs/);
    });

    it("fonte con url mancante — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = {
        ...VALID_PAYLOAD,
        sources: [{ title: "Fonte senza URL", url: "" }],
      };
      expect(() => validateDistillResult(payload)).toThrow();
    });

    it("input null — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(() => validateDistillResult(null)).toThrow();
    });

    it("input stringa — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      expect(() => validateDistillResult("stringa non valida")).toThrow();
    });

    it("distillArticles con payload tool_use invalido — lancia errore di validazione", async () => {
      mockFindUnique.mockResolvedValueOnce({ id: "default", claudeMode: "API_KEY" });
      mockCreate.mockResolvedValueOnce({
        content: [
          {
            type: "tool_use",
            id: "tool_invalid",
            name: "extract_distillation",
            input: { summary: "", positions: [], sources: [] },
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/Payload Claude non valido/);
    });
  });

  // ── buildDistillPrompt ────────────────────────────────────────────────────

  describe("buildDistillPrompt", () => {
    it("restituisce systemPrompt, userMessage e toolDef", async () => {
      const { buildDistillPrompt } = await import("@/lib/claude");
      const { systemPrompt, userMessage, toolDef } = buildDistillPrompt(
        SAMPLE_ARTICLES,
        "pensioni",
        "neutro"
      );

      expect(systemPrompt).toContain(TONE_INSTRUCTIONS["neutro"]);
      expect(userMessage).toContain("pensioni");
      expect(userMessage).toContain("Articolo 1");
      expect(toolDef.name).toBe("extract_distillation");
    });

    it("non ha side effect — non tocca SDK né prisma", async () => {
      const { buildDistillPrompt } = await import("@/lib/claude");
      buildDistillPrompt(SAMPLE_ARTICLES, "topic", "critico");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
});
