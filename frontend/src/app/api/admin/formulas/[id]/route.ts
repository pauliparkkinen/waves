import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization") ?? "";

    const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
      headers: authHeader ? { Authorization: authHeader } : {},
      cache: "no-store",
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : undefined) ?? `Formula fetch failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Formula proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to backend: ${message}` },
      { status: 502 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization") ?? "";
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
      method: "PUT",
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
          : undefined) ?? `Formula update failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Formula proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to backend: ${message}` },
      { status: 502 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get("Authorization") ?? "";

    const res = await fetch(`${BACKEND_URL}/admin/formulas/${id}`, {
      method: "DELETE",
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const errMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : undefined) ?? `Formula delete failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Formula proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to backend: ${message}` },
      { status: 502 }
    );
  }
}
