import { NextRequest } from "next/server";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (path.some((segment) => segment === "." || segment === "..")) {
    return Response.json({ detail: "Invalid API path" }, { status: 400 });
  }
  const upstream = new URL(
    `/api/v1/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
    process.env.BACKEND_URL || "http://127.0.0.1:8000",
  );
  const headers = new Headers();
  for (const key of [
    "content-type",
    "cookie",
    "x-csrf-token",
    "origin",
    "accept",
    "x-request-id",
    "idempotency-key",
  ]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  try {
    let body: ArrayBuffer | undefined;
    if (!["GET", "HEAD"].includes(request.method)) {
      const maximum = 6 * 1024 * 1024;
      if (Number(request.headers.get("content-length") || 0) > maximum) {
        return Response.json(
          { detail: "Request is too large" },
          { status: 413 },
        );
      }
      const reader = request.body?.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      if (reader) {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          if (size > maximum) {
            await reader.cancel();
            return Response.json(
              { detail: "Request is too large" },
              { status: 413 },
            );
          }
          chunks.push(chunk.value);
        }
      }
      const content = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        content.set(chunk, offset);
        offset += chunk.byteLength;
      }
      body = content.buffer;
    }
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    const output = new Headers();
    for (const key of [
      "content-type",
      "content-disposition",
      "x-request-id",
      "retry-after",
    ]) {
      const value = response.headers.get(key);
      if (value) output.set(key, value);
    }
    for (const cookie of response.headers.getSetCookie())
      output.append("set-cookie", cookie);
    output.set("cache-control", "no-store");
    return new Response(response.body, {
      status: response.status,
      headers: output,
    });
  } catch {
    return Response.json(
      {
        error: {
          message:
            "The hostel service is temporarily unavailable. Please try again shortly.",
        },
      },
      { status: 502 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
};
