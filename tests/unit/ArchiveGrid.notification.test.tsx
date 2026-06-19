import "@testing-library/jest-dom";
import React from "react";
import { render, act, waitFor } from "@testing-library/react";
import { ArchiveGrid } from "@/components/distill/ArchiveGrid";

jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) {
    return <a href={href} {...props}>{children}</a>;
  };
});

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
});

const RUNNING_JOB = {
  id: "job-1",
  topic: "Energia solare",
  tone: "neutro",
  status: "RUNNING" as const,
  createdAt: "2024-06-01T10:00:00Z",
  snippet: null,
  sourceCount: null,
  positionCount: null,
};

const DONE_JOB = {
  id: "job-2",
  topic: "Intelligenza artificiale",
  tone: "analitico",
  status: "DONE" as const,
  createdAt: "2024-06-01T11:00:00Z",
  snippet: "Sintesi AI",
  sourceCount: 3,
  positionCount: 2,
};

describe("ArchiveGrid — notifiche browser sulle transizioni", () => {
  it("emette notifica per un job che transita da RUNNING a DONE", async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      const updatedJob = callCount === 1
        ? { ...RUNNING_JOB, status: "DONE", snippet: "Risultato", sourceCount: 2, positionCount: 1 }
        : RUNNING_JOB;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([updatedJob]),
      });
    }) as jest.Mock;

    render(<ArchiveGrid initialJobs={[RUNNING_JOB]} />);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(MockNotification).toHaveBeenCalledWith(
        "Energia solare",
        expect.objectContaining({ body: "Distillato pronto", tag: "job-1" })
      );
    });
  });

  it("non emette notifica per job già DONE presenti in initialJobs", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([DONE_JOB]),
    }) as jest.Mock;

    render(<ArchiveGrid initialJobs={[DONE_JOB]} />);

    // DONE_JOB non ha status RUNNING/PENDING → nessun polling
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(MockNotification).not.toHaveBeenCalled();
  });

  it("emette notifica per un job che transita da RUNNING a FAILED", async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      const updatedJob = callCount === 1
        ? { ...RUNNING_JOB, status: "FAILED" }
        : RUNNING_JOB;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([updatedJob]),
      });
    }) as jest.Mock;

    render(<ArchiveGrid initialJobs={[RUNNING_JOB]} />);

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(MockNotification).toHaveBeenCalledWith(
        "Energia solare",
        expect.objectContaining({ body: "Elaborazione fallita", tag: "job-1" })
      );
    });
  });
});
