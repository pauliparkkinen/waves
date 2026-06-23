// Protect /dashboard and any sub-routes — redirect to sign-in if unauthenticated.
export { auth as middleware } from "@/auth";

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/forms/:path*"],
};
