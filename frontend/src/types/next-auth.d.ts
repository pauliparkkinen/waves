// Augment Auth.js types with the access token and org ID used to call the backend.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    organisationId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    organisationId?: string;
  }
}
