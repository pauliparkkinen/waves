import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/orchestrator/simulate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    // Try to read the response body regardless of status
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const errMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : undefined) ?? `Simulation failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Simulate proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to simulation backend: ${message}` },
      { status: 502 }
    );
  }
}
