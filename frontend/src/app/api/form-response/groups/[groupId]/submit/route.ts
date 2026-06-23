import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3000";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;
    const authHeader = request.headers.get("Authorization") ?? "";

    const res = await fetch(
      `${BACKEND_URL}/form-response/groups/${groupId}/submit`,
      {
        method: "POST",
        headers: authHeader ? { Authorization: authHeader } : {},
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const errMsg =
        (data && typeof data === "object" && "error" in data
          ? (data as { error: string }).error
          : undefined) ?? `Submit form response group failed (${res.status})`;
      return NextResponse.json({ error: errMsg }, { status: res.status });
    }

    return NextResponse.json({ status: res.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Submit form response group proxy error:", message);
    return NextResponse.json(
      { error: `Failed to connect to backend: ${message}` },
      { status: 502 }
    );
  }
}
