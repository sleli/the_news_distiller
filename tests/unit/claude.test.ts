const mockCreate = jest.fn();
const mockAnthropicConstructor = jest.fn(() => ({
  messages: { create: mockCreate },
}));

jest.mock("@anthropic-ai/sdk", () => ({
  __esModule: true,
  default: mockAnthropicConstructor,
}));

const mockOpenAICreate = jest.fn();
const mockOpenAIConstructor = jest.fn(() => ({
  chat: { completions: { create: mockOpenAICreate } },
}));

jest.mock("openai", () => ({
  __esModule: true,
  default: mockOpenAIConstructor,
}));

const mockSpawn = jest.fn();

jest.mock("child_process", () => ({
  spawn: mockSpawn,
}));

import { EventEmitter } from "events";
import { TONE_INSTRUCTIONS } from "@/lib/tones";

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
    process.env = { ...ORIGINAL_ENV };
    delete process.env.AI_PROVIDER;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_MODEL;
    mockCreate.mockReset();
    mockAnthropicConstructor.mockClear();
    mockOpenAICreate.mockReset();
    mockOpenAIConstructor.mockClear();
    mockSpawn.mockReset();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ── dispatching default — claude_subprocess ──────────────────────────────

  describe("default provider (claude_subprocess)", () => {
    it("usa claude_subprocess quando AI_PROVIDER non è impostato", async () => {
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: JSON.stringify(VALID_DISTILL_RESULT) })
      );

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "topic", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockSpawn).toHaveBeenCalledWith("claude", ["-p"], expect.any(Object));
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockOpenAICreate).not.toHaveBeenCalled();
    });
  });

  // ── provider anthropic ───────────────────────────────────────────────────

  describe("provider anthropic", () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = "anthropic";
      process.env.ANTHROPIC_API_KEY = "test-key";
    });

    it("happy path — restituisce DistillResult valido da un tool_use block", async () => {
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

    it("parametrizzazione tono — il system prompt contiene l'istruzione del tono richiesto", async () => {
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

    it("chiave mancante — lancia un errore se ANTHROPIC_API_KEY non è configurata", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow("ANTHROPIC_API_KEY");
    });

    it("tool use assente — lancia un errore se la risposta non contiene un tool_use block", async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: "text", text: "Risposta in testo libero" }],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "critico")
      ).rejects.toThrow("tool_use");
    });
  });

  // ── provider openai_compatible ───────────────────────────────────────────

  describe("provider openai_compatible", () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = "openai_compatible";
      process.env.OPENAI_API_KEY = "test-openai-key";
      process.env.OPENAI_BASE_URL = "https://openrouter.ai/api/v1";
      process.env.OPENAI_MODEL = "openai/gpt-4o";
    });

    it("happy path — restituisce DistillResult valido da JSON mode", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify(VALID_DISTILL_RESULT) },
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "riforma pensioni", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: "test-openai-key",
        baseURL: "https://openrouter.ai/api/v1",
      });
      expect(mockOpenAICreate).toHaveBeenCalledTimes(1);
      const callArgs = mockOpenAICreate.mock.calls[0][0];
      expect(callArgs.model).toBe("openai/gpt-4o");
      expect(callArgs.response_format).toEqual({ type: "json_object" });
      expect(mockSpawn).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("valida l'output con validateDistillResult()", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [
          {
            message: { content: JSON.stringify({ summary: "", positions: [], sources: [] }) },
          },
        ],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/Payload Claude non valido/);
    });

    it("risposta vuota — lancia un errore", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/non ha restituito contenuto/);
    });

    it("risposta non-JSON — lancia un errore di parsing", async () => {
      mockOpenAICreate.mockResolvedValueOnce({
        choices: [{ message: { content: "testo non JSON" } }],
      });

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/parsare/);
    });

    it("env vars mancanti — lancia errore con elenco variabili", async () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_MODEL;

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/OPENAI_API_KEY.*OPENAI_MODEL/);
    });
  });

  // ── validateProviderEnv ──────────────────────────────────────────────────

  describe("validateProviderEnv", () => {
    it("claude_subprocess non richiede env vars", async () => {
      const { validateProviderEnv } = await import("@/lib/claude");
      expect(() => validateProviderEnv("claude_subprocess")).not.toThrow();
    });

    it("anthropic senza ANTHROPIC_API_KEY lancia errore", async () => {
      const { validateProviderEnv } = await import("@/lib/claude");
      expect(() => validateProviderEnv("anthropic")).toThrow("ANTHROPIC_API_KEY");
    });

    it("openai_compatible senza tutte le vars elenca quelle mancanti", async () => {
      const { validateProviderEnv } = await import("@/lib/claude");
      expect(() => validateProviderEnv("openai_compatible")).toThrow(
        /OPENAI_API_KEY.*OPENAI_BASE_URL.*OPENAI_MODEL/
      );
    });
  });

  // ── modalità CLI_SUBPROCESS (via AI_PROVIDER) ───────────────────────────

  describe("provider claude_subprocess (esplicito)", () => {
    beforeEach(() => {
      process.env.AI_PROVIDER = "claude_subprocess";
    });

    it("happy path — invoca spawn e parsa lo stdout come DistillResult", async () => {
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: JSON.stringify(VALID_DISTILL_RESULT) })
      );

      const { distillArticles } = await import("@/lib/claude");
      const result = await distillArticles(SAMPLE_ARTICLES, "riforma pensioni", "neutro");

      expect(result).toEqual(VALID_DISTILL_RESULT);
      expect(mockSpawn).toHaveBeenCalledWith("claude", ["-p"], expect.any(Object));
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("ENOENT — lancia ClaudeCliNotFoundError", async () => {
      const enoentError = Object.assign(new Error("spawn claude ENOENT"), { code: "ENOENT" });
      mockSpawn.mockReturnValueOnce(fakeProcess({ errorEvent: enoentError }));

      const { distillArticles, ClaudeCliNotFoundError } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toBeInstanceOf(ClaudeCliNotFoundError);
    });

    it("exit code non-zero — lancia un errore generico", async () => {
      mockSpawn.mockReturnValueOnce(
        fakeProcess({ stdoutData: "", stderrData: "fatal error", exitCode: 1 })
      );

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/codice 1/);
    });

    it("stdout non-JSON — lancia un errore di parsing", async () => {
      mockSpawn.mockReturnValueOnce(fakeProcess({ stdoutData: "testo non JSON" }));

      const { distillArticles } = await import("@/lib/claude");
      await expect(
        distillArticles(SAMPLE_ARTICLES, "topic", "neutro")
      ).rejects.toThrow(/parsare/);
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

    it("posizione con sourceRefs contenente elementi non-stringa — lancia Error", async () => {
      const { validateDistillResult } = await import("@/lib/claude");
      const payload = {
        ...VALID_PAYLOAD,
        positions: [
          { ...VALID_PAYLOAD.positions[0], sourceRefs: [1, 2] as unknown as string[] },
        ],
      };
      expect(() => validateDistillResult(payload)).toThrow(/sourceRefs deve contenere solo stringhe/);
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

    it("non ha side effect — non tocca SDK né spawn", async () => {
      const { buildDistillPrompt } = await import("@/lib/claude");
      buildDistillPrompt(SAMPLE_ARTICLES, "topic", "critico");

      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockOpenAICreate).not.toHaveBeenCalled();
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });
});
