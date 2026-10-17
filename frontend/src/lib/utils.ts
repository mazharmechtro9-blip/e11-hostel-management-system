export const money = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
export const number = (value: number | string | null | undefined) =>
  new Intl.NumberFormat("en-PK").format(Number(value || 0));
export const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
export const title = (value: string) =>
  value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export type Row = Record<string, unknown>;
export function rows(value: unknown): Row[] {
  if (Array.isArray(value)) return value;
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray(value.items)
  )
    return value.items;
  return [];
}
export function text(value: unknown, fallback = "—"): string {
  return value === null || value === undefined || value === ""
    ? fallback
    : String(value);
}
