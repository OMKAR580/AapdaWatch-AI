/**
 * AapdaWatch AI — Safe CSV Serialization Utility
 * Enforces RFC 4180 compliance and formula injection protection (CWE-1236).
 */

const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single CSV field value and protects against CSV formula injection.
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return "";
  }

  let str = String(val);

  // SEC-02: Prevent CSV Formula Injection
  // If field starts with =, +, -, @, \t, or \r, prepend a single quote
  if (FORMULA_PREFIXES.some((prefix) => str.startsWith(prefix))) {
    str = `'${str}`;
  }

  // RFC 4180 escaping: wrap in quotes if it contains quotes, commas, or newlines
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Serializes an array of records into a valid CSV string.
 */
export function serializeToCsv<T extends Record<string, unknown>>(
  headers: { key: keyof T | string; label: string }[],
  data: T[],
): string {
  const headerRow = headers.map((h) => escapeCsvField(h.label)).join(",");
  const dataRows = data.map((row) =>
    headers
      .map((h) => escapeCsvField((row as Record<string, unknown>)[h.key as string]))
      .join(","),
  );

  return [headerRow, ...dataRows].join("\r\n");
}

