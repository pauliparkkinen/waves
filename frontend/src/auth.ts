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
    async jwt({ token, account }) {
      // Persist the access token in the JWT so it can be forwarded to the backend
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
