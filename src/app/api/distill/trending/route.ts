import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTrendingTopic } from "@/lib/tavily";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  }

  try {
    const topic = await getTrendingTopic();
    return NextResponse.json({ topic });
  } catch {
    return NextResponse.json(
      { error: "Impossibile recuperare il trending topic. Riprova più tardi." },
      { status: 500 }
    );
  }
}
