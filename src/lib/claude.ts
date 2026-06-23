import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { spawn } from "child_process";
import { ToneKey, TONE_INSTRUCTIONS } from "./tones";

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

export type AIProvider = "anthropic" | "openai_compatible" | "claude_subprocess";

export function validateProviderEnv(provider: AIProvider): void {
  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "AI_PROVIDER=anthropic richiede la variabile d'ambiente ANTHROPIC_API_KEY."
      );
    }
  } else if (provider === "openai_compatible") {
    const missing: string[] = [];
    if (!process.env.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
    if (!process.env.OPENAI_BASE_URL) missing.push("OPENAI_BASE_URL");
    if (!process.env.OPENAI_MODEL) missing.push("OPENAI_MODEL");
    if (missing.length > 0) {
      throw new Error(
        `AI_PROVIDER=openai_compatible richiede le variabili d'ambiente: ${missing.join(", ")}.`
      );
    }
  }
}

// lazy initialization — avoids crash at import when ANTHROPIC_API_KEY is absent
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

// Schema JSON atteso, condiviso dai provider che non vincolano la forma via tool/SDK
// (CLI e OpenAI-compatible). Unica fonte di verità per la struttura del payload.
const DISTILL_JSON_SCHEMA_HINT = `{"summary":"stringa","positions":[{"label":"stringa","headline":"stringa","body":"stringa","sourceRefs":["stringa"]}],"sources":[{"title":"stringa","url":"stringa"}]}`;

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
  const fullPrompt =
    `${systemPrompt}\n\n${userMessage}\n\n` +
    `Rispondi ESCLUSIVAMENTE con un oggetto JSON valido corrispondente a questo schema (nessun testo aggiuntivo, nessun markdown, nessun blocco di codice):\n${DISTILL_JSON_SCHEMA_HINT}`;

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

export async function distillViaOpenAI(
  systemPrompt: string,
  userMessage: string
): Promise<DistillResult> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL!,
    messages: [
      {
        role: "system",
        content:
          `${systemPrompt}\n\n` +
          `Rispondi ESCLUSIVAMENTE con un oggetto JSON valido corrispondente a questo schema (nessun testo aggiuntivo, nessun markdown, nessun blocco di codice):\n${DISTILL_JSON_SCHEMA_HINT}`,
      },
      { role: "user", content: userMessage },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Il provider OpenAI-compatible non ha restituito contenuto nella risposta.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Impossibile parsare l'output del provider OpenAI-compatible come JSON: ${content.substring(0, 200)}`
    );
  }

  return validateDistillResult(parsed);
}

export async function distillViaAnthropic(
  systemPrompt: string,
  userMessage: string,
  toolDef: Anthropic.Tool
): Promise<DistillResult> {
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

export async function distillArticles(
  articles: ArticleInput[],
  topic: string,
  tone: ToneKey
): Promise<DistillResult> {
  const provider = (process.env.AI_PROVIDER ?? "claude_subprocess") as AIProvider;
  validateProviderEnv(provider);

  const { systemPrompt, userMessage, toolDef } = buildDistillPrompt(articles, topic, tone);

  switch (provider) {
    case "claude_subprocess":
      return distillViaCLI(systemPrompt, userMessage);
    case "anthropic":
      return distillViaAnthropic(systemPrompt, userMessage, toolDef);
    case "openai_compatible":
      return distillViaOpenAI(systemPrompt, userMessage);
    default:
      throw new Error(`Provider AI non supportato: ${provider}`);
  }
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
    if (!p.sourceRefs.every((r) => typeof r === "string")) {
      throw new Error(`Payload Claude non valido — sourceRefs deve contenere solo stringhe: ${snippet}`);
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
