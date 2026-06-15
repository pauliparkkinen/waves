import { auth } from "@/auth";
import { getTestStatus } from "@/lib/api";
import SignInButton from "./components/SignInButton";
import SignOutButton from "./components/SignOutButton";

export default async function Home() {
  const session = await auth();

  let status: string | undefined;
  let statusError: string | undefined;
  try {
    const data = await getTestStatus(session?.accessToken);
    status = data.message;
  } catch {
    statusError = "Could not reach backend. Is it running on port 3000?";
  }

  return (
    <>
      <h1>Waves</h1>

      <div className="card">
        <h2>Authentication</h2>
        {session ? (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className="badge">Signed in</span>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {session.user?.email}
            </span>
            <SignOutButton />
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span className="badge error">Not signed in</span>
            <SignInButton />
          </div>
        )}
      </div>

      <div className="card">
        <h2>Backend status</h2>
        {statusError ? (
          <p className="error-message">{statusError}</p>
        ) : (
          <p>
            <span className="badge">{status}</span>
          </p>
        )}
      </div>

      {session && (
        <div className="card">
          <h2>Quick links</h2>
          <a href="/dashboard">View records (requires records:read permission)</a>
        </div>
      )}
    </>
  );
}
