import { tavily } from "@tavily/core";

if (!process.env.TAVILY_API_KEY) {
  throw new Error(
    "TAVILY_API_KEY non configurata. Aggiungi la variabile d'ambiente server-side prima di usare questo modulo."
  );
}

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

export type TavilyArticle = {
  title: string;
  url: string;
  content: string;
};

export async function searchArticles(
  topic: string,
  n: number
): Promise<TavilyArticle[]> {
  const response = await client.search(topic, {
    maxResults: n,
    topic: "news",
  });

  return response.results.map((result) => ({
    title: result.title,
    url: result.url,
    content: result.content ?? "",
  }));
}

export async function getTrendingTopic(): Promise<string> {
  const response = await client.search("notizie del giorno trending", {
    maxResults: 1,
    topic: "news",
  });

  const first = response.results[0];
  if (!first?.title) {
    throw new Error("Nessun trending topic disponibile al momento.");
  }

  return first.title;
}
