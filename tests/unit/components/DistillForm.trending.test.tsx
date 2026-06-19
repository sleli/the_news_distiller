import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DistillForm } from "@/components/distill/DistillForm";
import type { User } from "@prisma/client";

// next/navigation mock
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// sonner mock
jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

import { toast } from "sonner";

const mockUser = {
  id: "user-1",
  email: "marco@example.com",
  name: "Marco",
  passwordHash: "hash",
  image: null,
} as unknown as User;

function mockFetchOk(topic: string) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ topic }),
  } as Response);
}

function mockFetchError() {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status: 500,
    json: async () => ({}),
  } as Response);
}

describe("DistillForm — trending topic button", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    (toast.error as jest.Mock).mockClear();
  });

  it("il bottone 'Argomento del giorno' è visibile", () => {
    render(<DistillForm user={mockUser} />);
    expect(screen.getByTestId("trending-btn")).toBeInTheDocument();
    expect(screen.getByTestId("trending-btn")).toHaveTextContent("Argomento del giorno");
  });

  it("campo vuoto: click sul bottone → fetch chiamato → topic pre-compilato con il valore restituito", async () => {
    mockFetchOk("Intelligenza artificiale e lavoro");
    render(<DistillForm user={mockUser} />);

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("topic-input")).toHaveValue(
        "Intelligenza artificiale e lavoro"
      );
    });

    expect(global.fetch as jest.Mock).toHaveBeenCalledWith("/api/distill/trending");
  });

  it("campo con contenuto: click sul bottone → dialog mostrato (topic non ancora sovrascritto)", async () => {
    mockFetchOk("Trending topic del giorno");
    render(<DistillForm user={mockUser} />);

    // pre-compila il campo
    const topicInput = screen.getByTestId("topic-input");
    await userEvent.type(topicInput, "Argomento esistente");

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    // dialog deve apparire
    await waitFor(() => {
      expect(screen.getByTestId("overwrite-dialog")).toBeInTheDocument();
    });

    // il campo non è ancora stato sovrascritto
    expect(topicInput).toHaveValue("Argomento esistente");
  });

  it("dialog 'Sovrascrivi': click → topic sovrascritto e dialog chiuso", async () => {
    mockFetchOk("Nuovo trending topic");
    render(<DistillForm user={mockUser} />);

    const topicInput = screen.getByTestId("topic-input");
    await userEvent.type(topicInput, "Argomento esistente");

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("overwrite-dialog")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByTestId("confirm-overwrite-btn");
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(topicInput).toHaveValue("Nuovo trending topic");
    });

    expect(screen.queryByTestId("overwrite-dialog")).not.toBeInTheDocument();
  });

  it("dialog 'Annulla': click → topic invariato e dialog chiuso", async () => {
    mockFetchOk("Nuovo trending topic");
    render(<DistillForm user={mockUser} />);

    const topicInput = screen.getByTestId("topic-input");
    await userEvent.type(topicInput, "Argomento esistente");

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByTestId("overwrite-dialog")).toBeInTheDocument();
    });

    const cancelBtn = screen.getByTestId("cancel-overwrite-btn");
    await userEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("overwrite-dialog")).not.toBeInTheDocument();
    });

    expect(topicInput).toHaveValue("Argomento esistente");
  });

  it("durante il fetch: il bottone mostra lo spinner ed è disabilitato", async () => {
    // fetch non si risolve mai durante il controllo
    global.fetch = jest.fn().mockImplementation(
      () => new Promise(() => {}) // pending forever
    );

    render(<DistillForm user={mockUser} />);

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    // spinner deve essere presente e bottone disabilitato
    expect(screen.getByTestId("trending-spinner")).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it("errore API (fetch non-ok) → toast.error chiamato", async () => {
    mockFetchError();
    render(<DistillForm user={mockUser} />);

    const btn = screen.getByTestId("trending-btn");
    await userEvent.click(btn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Impossibile recuperare il trending topic. Riprova più tardi."
      );
    });
  });
});
