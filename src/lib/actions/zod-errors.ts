import type { ZodError } from "zod";

/** Chuyển ZodError thành map { tênTrường: thôngBáoLỗiĐầuTiên }. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !result[key]) {
      result[key] = issue.message;
    }
  }
  return result;
}
