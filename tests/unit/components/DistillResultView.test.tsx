import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DistillResultView } from "@/components/distill/DistillResultView";
import type { DistillResult } from "@/lib/claude";

const mockResult: DistillResult = {
  summary: "Sintesi di test sulle riforme pensionistiche italiane.",
  positions: [
    {
      label: "Posizione A",
      headline: "Il governo vuole abbassare l'età pensionabile",
      body: "I sindacati sostengono che la riforma è insufficiente.",
      sourceRefs: ["src-1"],
    },
    {
      label: "Posizione B",
      headline: "L'opposizione chiede più risorse per i giovani",
      body: "Diversi partiti di opposizione hanno presentato emendamenti.",
      sourceRefs: ["src-2"],
    },
  ],
  sources: [
    { title: "Corriere della Sera", url: "https://corriere.it/articolo-1" },
    { title: "La Repubblica", url: "https://repubblica.it/articolo-2" },
  ],
};

describe("DistillResultView", () => {
  it("mostra la sezione sintesi", () => {
    render(<DistillResultView result={mockResult} topic="Riforme pensioni" tone="neutro" />);
    expect(screen.getByTestId("synthesis-section")).toBeInTheDocument();
    expect(screen.getByText("Sintesi di test sulle riforme pensionistiche italiane.")).toBeInTheDocument();
  });

  it("renderizza il numero corretto di sezioni posizione", () => {
    render(<DistillResultView result={mockResult} topic="Riforme pensioni" tone="neutro" />);
    const sections = screen.getAllByTestId("position-section");
    expect(sections).toHaveLength(2);
  });

  it("tutti i link fonte hanno target=_blank e rel=noopener noreferrer", () => {
    render(<DistillResultView result={mockResult} topic="Riforme pensioni" tone="neutro" />);
    const links = screen.getAllByTestId("source-link");
    expect(links).toHaveLength(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });
  });

  it("rendering con sources vuoto non crasha", () => {
    const resultNoSources: DistillResult = { ...mockResult, sources: [] };
    render(<DistillResultView result={resultNoSources} topic="Test" tone="neutro" />);
    expect(screen.getByTestId("synthesis-section")).toBeInTheDocument();
    expect(screen.queryByTestId("sources-list")).not.toBeInTheDocument();
  });
});
