import { getErrorMessage } from "@/app/distill/[id]/page";

describe("getErrorMessage", () => {
  it("restituisce la stringa di errore quando result ha campo error non vuoto", () => {
    const result = { error: "Nessun articolo trovato" };
    expect(getErrorMessage(result)).toBe("Nessun articolo trovato");
  });

  it("restituisce null quando result è null", () => {
    expect(getErrorMessage(null)).toBeNull();
  });

  it("restituisce null quando result è un oggetto senza campo error", () => {
    const result = { summary: "qualcosa" };
    expect(getErrorMessage(result)).toBeNull();
  });

  it("restituisce null quando error è una stringa vuota", () => {
    const result = { error: "" };
    expect(getErrorMessage(result)).toBeNull();
  });
});
