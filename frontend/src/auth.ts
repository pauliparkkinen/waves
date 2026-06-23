import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import Zitadel from "next-auth/providers/zitadel";

const providerName = process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "zitadel";

function buildProvider() {
  if (providerName === "keycloak") {
    return Keycloak({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      issuer: process.env.KEYCLOAK_ISSUER!,
    });
  }
  return Zitadel({
    clientId: process.env.ZITADEL_CLIENT_ID!,
    issuer: process.env.ZITADEL_ISSUER!,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [buildProvider()],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the access token in the JWT so it can be forwarded to the backend
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      // Extract organisation ID from the OIDC profile (if available)
      if (profile) {
        const p = profile as Record<string, unknown>;
        token.organisationId = (p.organisation_id as string) ?? (p.org_id as string) ?? undefined;

        // Extract roles from the OIDC profile
        // Keycloak: p.realm_access?.roles
        // Zitadel: p.roles
        const realmAccess = p.realm_access as { roles?: string[] } | undefined;
        const roles = realmAccess?.roles ?? (p.roles as string[] | undefined) ?? [];
        token.roles = roles;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      session.organisationId = token.organisationId as string | undefined;
      session.roles = token.roles as string[] | undefined;
      return session;
    },
  },
});
