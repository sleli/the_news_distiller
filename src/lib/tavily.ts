import "server-only";
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
