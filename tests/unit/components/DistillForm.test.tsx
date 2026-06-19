import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DistillForm, JobSummary } from "@/components/distill/DistillForm";
import type { User } from "@prisma/client";

// next/navigation mock
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockUser = {
  id: "user-1",
  email: "marco@example.com",
  name: "Marco",
  passwordHash: "hash",
  image: null,
} as unknown as User;

const makeJob = (overrides: Partial<JobSummary>): JobSummary => ({
  id: "job-1",
  topic: "Riforma pensioni",
  tone: "neutro",
  status: "PENDING",
  createdAt: new Date("2026-06-19T10:00:00Z").toISOString(),
  ...overrides,
});

describe("DistillForm — history sidebar", () => {
  it("mostra placeholder quando nessun job", () => {
    render(<DistillForm user={mockUser} jobs={[]} />);
    expect(screen.getByText("Nessuna richiesta recente.")).toBeInTheDocument();
    expect(screen.queryByTestId("history-list")).not.toBeInTheDocument();
  });

  it("renderizza la lista con data-testid history-list quando ci sono job", () => {
    render(<DistillForm user={mockUser} jobs={[makeJob({})]} />);
    expect(screen.getByTestId("history-list")).toBeInTheDocument();
    expect(screen.queryByText("Nessuna richiesta recente.")).not.toBeInTheDocument();
  });

  it("job DONE mostra un link cliccabile a /distill/[id]", () => {
    const job = makeJob({ id: "abc123", status: "DONE" });
    render(<DistillForm user={mockUser} jobs={[job]} />);
    const link = screen.getByRole("link", { name: /riforma pensioni/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/distill/abc123");
  });

  it("job FAILED mostra badge con colore errore (rosso)", () => {
    const job = makeJob({ status: "FAILED" });
    render(<DistillForm user={mockUser} jobs={[job]} />);
    const badge = screen.getByTestId("status-badge");
    expect(badge).toHaveTextContent("Errore");
    expect(badge).toHaveStyle({ color: "#cc2200" });
  });

  it("job PENDING non mostra link, mostra badge 'In coda'", () => {
    const job = makeJob({ status: "PENDING" });
    render(<DistillForm user={mockUser} jobs={[job]} />);
    expect(screen.queryByRole("link", { name: /riforma pensioni/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("status-badge")).toHaveTextContent("In coda");
  });

  it("job PROCESSING non mostra link, mostra badge 'In elaborazione'", () => {
    const job = makeJob({ status: "PROCESSING" });
    render(<DistillForm user={mockUser} jobs={[job]} />);
    expect(screen.queryByRole("link", { name: /riforma pensioni/i })).not.toBeInTheDocument();
    expect(screen.getByTestId("status-badge")).toHaveTextContent("In elaborazione");
  });

  it("renderizza tutti i job della lista", () => {
    const jobs = [
      makeJob({ id: "j1", topic: "Primo argomento", status: "DONE" }),
      makeJob({ id: "j2", topic: "Secondo argomento", status: "PENDING" }),
    ];
    render(<DistillForm user={mockUser} jobs={jobs} />);
    const items = screen.getAllByTestId("history-item");
    expect(items).toHaveLength(2);
  });
});
