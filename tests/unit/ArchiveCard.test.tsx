import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ArchiveCard, type ArchiveJobData } from "@/components/distill/ArchiveCard";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

function makeJob(overrides: Partial<ArchiveJobData> = {}): ArchiveJobData {
  return {
    id: "job-1",
    topic: "Energia solare in Italia",
    tone: "neutro",
    status: "DONE",
    createdAt: "2024-06-01T10:00:00Z",
    snippet: "Breve sintesi sull'energia solare.",
    sourceCount: 5,
    positionCount: 3,
    ...overrides,
  };
}

describe("ArchiveCard", () => {
  describe("indicatore di stato tramite data-status", () => {
    it("PENDING: data-status='PENDING'", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.getByTestId("archive-card")).toHaveAttribute("data-status", "PENDING");
    });

    it("RUNNING: data-status='RUNNING'", () => {
      render(<ArchiveCard job={makeJob({ status: "RUNNING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.getByTestId("archive-card")).toHaveAttribute("data-status", "RUNNING");
    });

    it("DONE: data-status='DONE'", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE" })} />);
      expect(screen.getByTestId("archive-card")).toHaveAttribute("data-status", "DONE");
    });

    it("FAILED: data-status='FAILED'", () => {
      render(<ArchiveCard job={makeJob({ status: "FAILED", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.getByTestId("archive-card")).toHaveAttribute("data-status", "FAILED");
    });
  });

  describe("link Leggi", () => {
    it("presente solo per DONE", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE" })} />);
      expect(screen.getByTestId("card-read-link")).toBeInTheDocument();
    });

    it("assente per PENDING", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-read-link")).not.toBeInTheDocument();
    });

    it("assente per RUNNING", () => {
      render(<ArchiveCard job={makeJob({ status: "RUNNING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-read-link")).not.toBeInTheDocument();
    });

    it("assente per FAILED", () => {
      render(<ArchiveCard job={makeJob({ status: "FAILED", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-read-link")).not.toBeInTheDocument();
    });
  });

  describe("snippet e contatori per DONE", () => {
    it("snippet visibile per DONE", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE", snippet: "Sintesi breve." })} />);
      expect(screen.getByTestId("card-snippet")).toHaveTextContent("Sintesi breve.");
    });

    it("contatori visibili per DONE", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE", sourceCount: 4, positionCount: 2 })} />);
      expect(screen.getByTestId("card-counts")).toHaveTextContent("4 fonti");
      expect(screen.getByTestId("card-counts")).toHaveTextContent("2 posizioni");
    });

    it("snippet assente per PENDING", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-snippet")).not.toBeInTheDocument();
    });

    it("contatori assenti per PENDING", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-counts")).not.toBeInTheDocument();
    });
  });

  describe("testo aggiornamento automatico per RUNNING", () => {
    it("presente per RUNNING", () => {
      render(<ArchiveCard job={makeJob({ status: "RUNNING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.getByTestId("card-polling-label")).toBeInTheDocument();
    });

    it("assente per PENDING", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-polling-label")).not.toBeInTheDocument();
    });

    it("assente per DONE", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE" })} />);
      expect(screen.queryByTestId("card-polling-label")).not.toBeInTheDocument();
    });

    it("assente per FAILED", () => {
      render(<ArchiveCard job={makeJob({ status: "FAILED", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-polling-label")).not.toBeInTheDocument();
    });
  });

  describe("link topic cliccabile solo per DONE", () => {
    it("topic è un link per DONE", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE" })} />);
      expect(screen.getByTestId("card-link")).toBeInTheDocument();
    });

    it("topic non è un link per PENDING", () => {
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-link")).not.toBeInTheDocument();
    });

    it("topic non è un link per FAILED", () => {
      render(<ArchiveCard job={makeJob({ status: "FAILED", snippet: null, sourceCount: null, positionCount: null })} />);
      expect(screen.queryByTestId("card-link")).not.toBeInTheDocument();
    });
  });

  describe("bottone cestino", () => {
    it("delete-btn presente per stato PENDING quando viene passata prop onDelete", () => {
      const onDelete = jest.fn();
      render(<ArchiveCard job={makeJob({ status: "PENDING", snippet: null, sourceCount: null, positionCount: null })} onDelete={onDelete} />);
      expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
    });

    it("delete-btn presente per stato RUNNING quando viene passata prop onDelete", () => {
      const onDelete = jest.fn();
      render(<ArchiveCard job={makeJob({ status: "RUNNING", snippet: null, sourceCount: null, positionCount: null })} onDelete={onDelete} />);
      expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
    });

    it("delete-btn presente per stato DONE quando viene passata prop onDelete", () => {
      const onDelete = jest.fn();
      render(<ArchiveCard job={makeJob({ status: "DONE" })} onDelete={onDelete} />);
      expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
    });

    it("delete-btn presente per stato FAILED quando viene passata prop onDelete", () => {
      const onDelete = jest.fn();
      render(<ArchiveCard job={makeJob({ status: "FAILED", snippet: null, sourceCount: null, positionCount: null })} onDelete={onDelete} />);
      expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
    });

    it("click su delete-btn chiama onDelete con il corretto job.id", () => {
      const onDelete = jest.fn();
      render(<ArchiveCard job={makeJob({ id: "job-42", status: "DONE" })} onDelete={onDelete} />);
      fireEvent.click(screen.getByTestId("delete-btn"));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith("job-42");
    });

    it("delete-btn assente quando onDelete non è passata", () => {
      render(<ArchiveCard job={makeJob({ status: "DONE" })} />);
      expect(screen.queryByTestId("delete-btn")).not.toBeInTheDocument();
    });
  });
});
