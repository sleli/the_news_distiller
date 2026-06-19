import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "child_process";
import { ToneKey, TONE_INSTRUCTIONS } from "./tones";
import { prisma } from "./prisma";

export type ArticleInput = {
  title: string;
  url: string;
  content: string;
};

export type DistillPosition = {
  label: string;
  headline: string;
  body: string;
  sourceRefs: string[];
};

export type DistillSource = {
  title: string;
  url: string;
};

export type DistillResult = {
  summary: string;
  positions: DistillPosition[];
  sources: DistillSource[];
};

// TASK-01: lazy initialization — avoids crash at import when ANTHROPIC_API_KEY is absent (CLI_SUBPROCESS mode)
let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY non configurata. Aggiungi la variabile d'ambiente server-side prima di usare questo modulo."
    );
  }
  if (!_anthropicClient) {
    _anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropicClient;
}

const DISTILL_TOOL: Anthropic.Tool = {
  name: "extract_distillation",
  description: "Estrai una distillazione strutturata degli articoli forniti.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "Sintesi complessiva delle notizie sul topic.",
      },
      positions: {
        type: "array",
        description: "Principali posizioni o angolazioni emerse dagli articoli.",
        items: {
          type: "object",
          properties: {
            label: { type: "string", description: "Etichetta breve della posizione." },
            headline: { type: "string", description: "Titolo sintetico della posizione." },
            body: { type: "string", description: "Descrizione estesa della posizione." },
            sourceRefs: {
              type: "array",
              description: "Riferimenti alle fonti che supportano questa posizione.",
              items: { type: "string" },
              minItems: 1,
            },
          },
          required: ["label", "headline", "body", "sourceRefs"],
        },
      },
      sources: {
        type: "array",
        description: "Elenco delle fonti utilizzate.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Titolo dell'articolo fonte." },
            url: { type: "string", description: "URL dell'articolo fonte." },
          },
          required: ["title", "url"],
        },
      },
    },
    required: ["summary", "positions", "sources"],
  },
};

// TASK-02: pure exported function — no side effects, no external dependencies
export function buildDistillPrompt(
  articles: ArticleInput[],
  topic: string,
  tone: ToneKey
): { systemPrompt: string; userMessage: string; toolDef: Anthropic.Tool } {
  const toneInstruction = TONE_INSTRUCTIONS[tone];
  const articlesText = articles
    .map((a, i) => `[${i + 1}] ${a.title}\n${a.url}\n${a.content}`)
    .join("\n\n---\n\n");

  return {
    systemPrompt: `Sei un distillatore di notizie. ${toneInstruction}`,
    userMessage: `Analizza questi articoli sul topic "${topic}" e produci una distillazione strutturata.\n\n${articlesText}`,
    toolDef: DISTILL_TOOL,
  };
}

// TASK-03: CLI subprocess backend
export class ClaudeCliNotFoundError extends Error {
  constructor() {
    super(
      "Comando `claude` non trovato nel PATH. Installa Claude Code CLI per usare la modalità CLI_SUBPROCESS."
    );
    this.name = "ClaudeCliNotFoundError";
  }
}

export async function distillViaCLI(
  systemPrompt: string,
  userMessage: string
): Promise<DistillResult> {
  const jsonSchemaHint = `{"summary":"stringa","positions":[{"label":"stringa","headline":"stringa","body":"stringa","sourceRefs":["stringa"]}],"sources":[{"title":"stringa","url":"stringa"}]}`;
  const fullPrompt =
    `${systemPrompt}\n\n${userMessage}\n\n` +
    `Rispondi ESCLUSIVAMENTE con un oggetto JSON valido corrispondente a questo schema (nessun testo aggiuntivo, nessun markdown, nessun blocco di codice):\n${jsonSchemaHint}`;

  return new Promise((resolve, reject) => {
    const proc = spawn("claude", ["-p"], { stdio: ["pipe", "pipe", "pipe"] });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(new ClaudeCliNotFoundError());
      } else {
        reject(err);
      }
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    proc.on("close", (code: number | null) => {
      if (code !== 0) {
        reject(
          new Error(
            `claude -p ha terminato con codice ${code}${stderr ? `: ${stderr.trim()}` : ""}`
          )
        );
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(stdout.trim());
      } catch {
        reject(
          new Error(
            `Impossibile parsare l'output di claude -p come JSON: ${stdout.substring(0, 200)}`
          )
        );
        return;
      }
      try {
        resolve(validateDistillResult(parsed));
      } catch (err) {
        reject(err);
      }
    });

    proc.stdin?.write(fullPrompt);
    proc.stdin?.end();
  });
}

// TASK-04: dispatch based on AppSettings.claudeMode
export async function distillArticles(
  articles: ArticleInput[],
  topic: string,
  tone: ToneKey
): Promise<DistillResult> {
  const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
  const claudeMode = settings?.claudeMode ?? "API_KEY";

  const { systemPrompt, userMessage, toolDef } = buildDistillPrompt(articles, topic, tone);

  if (claudeMode === "CLI_SUBPROCESS") {
    return distillViaCLI(systemPrompt, userMessage);
  }

  // API_KEY branch — original behavior
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
    tools: [toolDef],
    tool_choice: { type: "tool", name: "extract_distillation" },
  });

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude non ha restituito un tool_use block come atteso.");
  }

  return validateDistillResult(toolUse.input);
}

export function validateDistillResult(input: unknown): DistillResult {
  const snippet = JSON.stringify(input).substring(0, 500);

  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`Payload Claude non valido: ${snippet}`);
  }

  const obj = input as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.trim() === "") {
    throw new Error(`Payload Claude non valido — summary mancante o vuoto: ${snippet}`);
  }

  if (!Array.isArray(obj.positions) || obj.positions.length === 0) {
    throw new Error(`Payload Claude non valido — positions deve essere array non vuoto: ${snippet}`);
  }

  for (const pos of obj.positions) {
    if (pos === null || typeof pos !== "object" || Array.isArray(pos)) {
      throw new Error(`Payload Claude non valido — position non è un oggetto: ${snippet}`);
    }
    const p = pos as Record<string, unknown>;
    if (typeof p.label !== "string") throw new Error(`Payload Claude non valido — position.label mancante: ${snippet}`);
    if (typeof p.headline !== "string") throw new Error(`Payload Claude non valido — position.headline mancante: ${snippet}`);
    if (typeof p.body !== "string") throw new Error(`Payload Claude non valido — position.body mancante: ${snippet}`);
    if (!Array.isArray(p.sourceRefs) || p.sourceRefs.length === 0) {
      throw new Error(`Payload Claude non valido — sourceRefs deve avere almeno 1 elemento: ${snippet}`);
    }
  }

  if (!Array.isArray(obj.sources)) {
    throw new Error(`Payload Claude non valido — sources deve essere array: ${snippet}`);
  }

  for (const src of obj.sources) {
    if (src === null || typeof src !== "object" || Array.isArray(src)) {
      throw new Error(`Payload Claude non valido — source non è un oggetto: ${snippet}`);
    }
    const s = src as Record<string, unknown>;
    if (typeof s.title !== "string" || s.title.trim() === "") throw new Error(`Payload Claude non valido — source.title mancante: ${snippet}`);
    if (typeof s.url !== "string" || s.url.trim() === "") throw new Error(`Payload Claude non valido — source.url mancante: ${snippet}`);
  }

  return input as DistillResult;
}
