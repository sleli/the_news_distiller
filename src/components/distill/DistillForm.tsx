"use client";

import { useState } from "react";
import type { User } from "@prisma/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_DESCRIPTIONS = {
  neutro: {
    title: "Neutro",
    badge: "Default",
    hint: "Fattuale e bilanciato",
    desc: "Il distillato presenterà le posizioni in modo fattuale e bilanciato, senza enfatizzare alcun punto di vista. Ideale per formarsi un'opinione autonoma senza essere condizionati da una lettura preimpostata.",
  },
  analitico: {
    title: "Analitico",
    badge: "Dati",
    hint: "Prove e ragionamento",
    desc: "Il distillato si concentrerà su dati, prove e catene di ragionamento. Ogni posizione verrà valutata sulla base delle evidenze citate dalle fonti, con particolare attenzione alle implicazioni logiche.",
  },
  divulgativo: {
    title: "Divulgativo",
    badge: "Chiaro",
    hint: "Accessibile, semplificato",
    desc: "Il distillato sarà accessibile e semplificato, con spiegazioni dei concetti chiave e analogie utili. Adatto a chi si avvicina al tema per la prima volta o vuole condividerlo con un pubblico eterogeneo.",
  },
  critico: {
    title: "Critico",
    badge: "Attento",
    hint: "Contraddizioni in luce",
    desc: "Il distillato metterà in evidenza contraddizioni, omissioni e punti deboli di ogni posizione. Utile per approfondire, contestare le narrative dominanti e riconoscere gli interessi in gioco.",
  },
} as const;

type ToneKey = keyof typeof TONE_DESCRIPTIONS;

interface DistillFormProps {
  user: User;
}

export function DistillForm({ user }: DistillFormProps) {
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<ToneKey>("neutro");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSubmitDisabled = topic.trim() === "" || isSubmitting;
  const selectedTone = TONE_DESCRIPTIONS[tone];
  const charCount = topic.length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/distill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, tone }),
      });

      if (!response.ok) {
        setSubmitError("Si è verificato un errore. Riprova più tardi.");
      }
    } catch {
      setSubmitError("Si è verificato un errore. Riprova più tardi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b-4 border-black pb-4">
          <h1 className="text-4xl font-black uppercase tracking-tight text-black">
            Il Distillatore
          </h1>
          <p className="text-sm text-gray-600 mt-1 uppercase tracking-widest">
            Notizie filtrate per {user.name ?? user.email}
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main form — 2/3 */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Topic section */}
              <Card className="border-2 border-black rounded-none shadow-none">
                <CardHeader className="pb-2 border-b border-gray-200">
                  <CardTitle className="text-xs uppercase tracking-widest font-bold text-gray-500">
                    Argomento
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  <Label htmlFor="topic" className="sr-only">
                    Inserisci un argomento
                  </Label>
                  <Textarea
                    id="topic"
                    name="topic"
                    placeholder="Es. riforma pensioni, intelligenza artificiale, cambiamento climatico..."
                    maxLength={300}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="min-h-[120px] resize-none border-0 focus-visible:ring-0 focus-visible:border-0 p-0 text-base"
                  />
                  <div
                    className={cn(
                      "text-right text-xs tabular-nums",
                      charCount >= 280
                        ? "text-red-600 font-semibold"
                        : charCount >= 200
                          ? "text-amber-600"
                          : "text-gray-400"
                    )}
                  >
                    {charCount} / 300 caratteri
                  </div>
                </CardContent>
              </Card>

              {/* Tone selector */}
              <Card className="border-2 border-black rounded-none shadow-none">
                <CardHeader className="pb-2 border-b border-gray-200">
                  <CardTitle className="text-xs uppercase tracking-widest font-bold text-gray-500">
                    Tono del distillato
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {/* 2x2 tone grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(TONE_DESCRIPTIONS) as ToneKey[]).map((key) => {
                      const t = TONE_DESCRIPTIONS[key];
                      const isSelected = tone === key;
                      return (
                        <label
                          key={key}
                          className={cn(
                            "relative flex flex-col gap-1 p-3 border-2 cursor-pointer transition-all",
                            isSelected
                              ? "border-black bg-black text-white"
                              : "border-gray-200 bg-white hover:border-gray-400"
                          )}
                        >
                          <input
                            type="radio"
                            name="tone"
                            value={key}
                            checked={isSelected}
                            onChange={() => setTone(key)}
                            className="sr-only"
                          />
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm">{t.title}</span>
                            <span
                              className={cn(
                                "text-xs px-1.5 py-0.5 font-mono uppercase",
                                isSelected
                                  ? "bg-white text-black"
                                  : "bg-gray-100 text-gray-600"
                              )}
                            >
                              {t.badge}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "text-xs",
                              isSelected ? "text-gray-300" : "text-gray-500"
                            )}
                          >
                            {t.hint}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Tone preview box */}
                  <div
                    className="border border-dashed border-gray-300 bg-gray-50 p-4"
                    data-testid="tone-preview"
                  >
                    <p className="text-xs uppercase tracking-widest font-bold text-gray-400 mb-2">
                      {selectedTone.title} — anteprima
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {selectedTone.desc}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Submit area */}
              {submitError && (
                <p className="text-sm text-red-600" role="alert">
                  {submitError}
                </p>
              )}
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-wider">
                  Il distillato verrà generato e inviato
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className={cn(
                    "uppercase tracking-widest font-black rounded-none px-8 py-3 text-sm",
                    isSubmitDisabled
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-red-600 hover:bg-red-700 text-white"
                  )}
                  data-testid="submit-button"
                >
                  {isSubmitting ? "Invio in corso..." : "Distilla"}
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar — 1/3 */}
          <aside className="space-y-6">
            {/* Editorial tips */}
            <Card className="border-2 border-black rounded-none shadow-none">
              <CardHeader className="pb-2 border-b border-gray-200">
                <CardTitle className="text-xs uppercase tracking-widest font-bold text-gray-500">
                  Consigli Editoriali
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-sm text-gray-600">
                <p className="leading-snug">
                  <strong className="text-black">Sii specifico.</strong> "Riforma pensioni 2025"
                  produce risultati migliori di "pensioni".
                </p>
                <p className="leading-snug">
                  <strong className="text-black">Usa il tono giusto.</strong> Per un pubblico
                  tecnico scegli Analitico; per condividere scegli Divulgativo.
                </p>
                <p className="leading-snug">
                  <strong className="text-black">Revoca i bias.</strong> Il tono Critico mette
                  in luce ciò che le fonti tacciono.
                </p>
              </CardContent>
            </Card>

            {/* Recent requests (decorative/static) */}
            <Card className="border-2 border-black rounded-none shadow-none">
              <CardHeader className="pb-2 border-b border-gray-200">
                <CardTitle className="text-xs uppercase tracking-widest font-bold text-gray-500">
                  Richieste Recenti
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-2">
                {[
                  { topic: "intelligenza artificiale", tone: "Analitico" },
                  { topic: "cambiamento climatico", tone: "Critico" },
                  { topic: "mercato immobiliare", tone: "Neutro" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-gray-700 truncate max-w-[140px]">{item.topic}</span>
                    <span className="text-gray-400 font-mono ml-2 shrink-0">{item.tone}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
