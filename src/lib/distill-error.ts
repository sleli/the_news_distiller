export function getErrorMessage(result: unknown): string | null {
  if (
    result !== null &&
    typeof result === "object" &&
    "error" in result &&
    typeof (result as Record<string, unknown>).error === "string" &&
    (result as Record<string, unknown>).error !== ""
  ) {
    return (result as Record<string, unknown>).error as string;
  }
  return null;
}
