import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "@/components/settings/SettingsForm";

const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe("SettingsForm", () => {
  it("renderizza con il claudeMode iniziale API_KEY selezionato", () => {
    render(<SettingsForm initialMode="API_KEY" />);

    const cardApiKey = screen.getByTestId("card-api-key");
    expect(cardApiKey).toHaveClass("selected");

    const cardCli = screen.getByTestId("card-cli");
    expect(cardCli).not.toHaveClass("selected");
  });

  it("renderizza con il claudeMode iniziale CLI_SUBPROCESS selezionato", () => {
    render(<SettingsForm initialMode="CLI_SUBPROCESS" />);

    const cardCli = screen.getByTestId("card-cli");
    expect(cardCli).toHaveClass("selected");

    const cardApiKey = screen.getByTestId("card-api-key");
    expect(cardApiKey).not.toHaveClass("selected");
  });

  it("cambiare selezione aggiorna lo stato visivo della card", () => {
    render(<SettingsForm initialMode="API_KEY" />);

    const cardCli = screen.getByTestId("card-cli");
    fireEvent.click(cardCli);

    expect(cardCli).toHaveClass("selected");
    expect(screen.getByTestId("card-api-key")).not.toHaveClass("selected");
  });

  it("click Salva chiama PATCH /api/settings con il modo selezionato", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ claudeMode: "CLI_SUBPROCESS" }),
    });

    render(<SettingsForm initialMode="API_KEY" />);

    fireEvent.click(screen.getByTestId("card-cli"));
    fireEvent.click(screen.getByTestId("save-button"));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claudeMode: "CLI_SUBPROCESS" }),
      });
    });
  });

  it("risposta ok mostra messaggio di conferma", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ claudeMode: "API_KEY" }),
    });

    render(<SettingsForm initialMode="API_KEY" />);
    fireEvent.click(screen.getByTestId("save-button"));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-success")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("feedback-error")).not.toBeInTheDocument();
  });

  it("risposta errore mostra messaggio di errore", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Errore server" }),
    });

    render(<SettingsForm initialMode="API_KEY" />);
    fireEvent.click(screen.getByTestId("save-button"));

    await waitFor(() => {
      expect(screen.getByTestId("feedback-error")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("feedback-success")).not.toBeInTheDocument();
  });
});
