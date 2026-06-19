export const STATUS_LABELS: Record<string, string> = {
  PENDING: "In coda",
  PROCESSING: "In elaborazione",
  DONE: "Completato",
  FAILED: "Errore",
};

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}
