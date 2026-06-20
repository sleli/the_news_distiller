import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { ArchiveGrid } from "@/components/distill/ArchiveGrid";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

// Mock Notification API
const MockNotification = jest.fn().mockImplementation(() => ({ onclick: null }));
Object.defineProperty(MockNotification, "permission", {
  get: () => "granted",
  configurable: true,
});
Object.defineProperty(MockNotification, "requestPermission", {
  value: jest.fn().mockResolvedValue("granted"),
  configurable: true,
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  Object.defineProperty(window, "Notification", {
    value: MockNotification,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const JOB_DONE = {
  id: "job-done-1",
  topic: "Energia solare",
  tone: "neutro",
  status: "DONE" as const,
  createdAt: "2024-06-01T10:00:00Z",
  snippet: "Breve sintesi.",
  sourceCount: 3,
  positionCount: 2,
};

const JOB_DONE_2 = {
  id: "job-done-2",
  topic: "Intelligenza artificiale",
  tone: "analitico",
  status: "DONE" as const,
  createdAt: "2024-06-02T10:00:00Z",
  snippet: "Sintesi AI.",
  sourceCount: 4,
  positionCount: 3,
};

describe("ArchiveGrid — eliminazione ottimistica", () => {
  describe("Scenario 1: eliminazione con successo — card rimossa dalla griglia", () => {
    it("dopo conferma dialog la card scompare dalla griglia", async () => {
      // Mock window.confirm → accetta
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

      // Fetch DELETE restituisce 200
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      }) as jest.Mock;

      render(<ArchiveGrid initialJobs={[JOB_DONE, JOB_DONE_2]} />);

      // Entrambe le card sono visibili
      const cards = screen.getAllByTestId("archive-card");
      expect(cards).toHaveLength(2);

      // Click sul bottone cestino della prima card
      const deleteButtons = screen.getAllByTestId("delete-btn");
      await act(async () => {
        deleteButtons[0].click();
      });

      // Dopo eliminazione ottimistica, solo una card rimane
      await waitFor(() => {
        expect(screen.getAllByTestId("archive-card")).toHaveLength(1);
      });

      expect(confirmSpy).toHaveBeenCalledWith("Sei sicuro? Questa azione è irreversibile.");
      confirmSpy.mockRestore();
    });
  });

  describe("Scenario 2: annullamento dialog — card rimane", () => {
    it("se il dialog viene annullato, la card non viene rimossa", async () => {
      // Mock window.confirm → annulla
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(false);

      global.fetch = jest.fn() as jest.Mock;

      render(<ArchiveGrid initialJobs={[JOB_DONE, JOB_DONE_2]} />);

      const cards = screen.getAllByTestId("archive-card");
      expect(cards).toHaveLength(2);

      const deleteButtons = screen.getAllByTestId("delete-btn");
      await act(async () => {
        deleteButtons[0].click();
      });

      // Il numero di card rimane invariato
      expect(screen.getAllByTestId("archive-card")).toHaveLength(2);

      // Fetch non deve essere stato chiamato
      expect(global.fetch).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe("Scenario 3: errore API — rollback della card e messaggio deleteError", () => {
    it("se la DELETE restituisce 500, la card viene ripristinata e il banner deleteError è visibile", async () => {
      // Mock window.confirm → accetta
      const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

      // Fetch DELETE restituisce 500
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      }) as jest.Mock;

      render(<ArchiveGrid initialJobs={[JOB_DONE, JOB_DONE_2]} />);

      const cards = screen.getAllByTestId("archive-card");
      expect(cards).toHaveLength(2);

      const deleteButtons = screen.getAllByTestId("delete-btn");
      await act(async () => {
        deleteButtons[0].click();
      });

      // Dopo il rollback, le card ritornano a 2
      await waitFor(() => {
        expect(screen.getAllByTestId("archive-card")).toHaveLength(2);
      });

      // Il banner di errore deve essere visibile
      await waitFor(() => {
        expect(screen.getByTestId("delete-error")).toBeInTheDocument();
      });

      const errorBanner = screen.getByTestId("delete-error");
      expect(errorBanner).toHaveTextContent("Impossibile eliminare");

      confirmSpy.mockRestore();
    });
  });
});
