export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}
export async function api<T = Record<string, unknown>>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  if (
    options.method &&
    !["GET", "HEAD", "OPTIONS"].includes(options.method.toUpperCase()) &&
    typeof document !== "undefined"
  ) {
    const token = document.cookie
      .split("; ")
      .find((v) => v.startsWith("e11_csrf="))
      ?.split("=")
      .slice(1)
      .join("=");
    if (token) headers.set("X-CSRF-Token", decodeURIComponent(token));
  }
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error =
      data?.error?.message ||
      data?.detail?.message ||
      (typeof data?.detail === "string" ? data.detail : null) ||
      data?.message;
    throw new APIError(
      error ||
        `The request could not be completed (${response.status}). Please try again.`,
      response.status,
      data,
    );
  }
  return data as T;
}
