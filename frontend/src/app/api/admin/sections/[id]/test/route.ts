import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization") ?? "";
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/admin/sections/${id}/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : undefined) ?? `Sandbox test failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Sandbox test proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to backend: ${message}` },
      { status: 502 }
    );
  }
}
