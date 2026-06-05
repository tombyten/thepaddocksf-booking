export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bookings/:path*",
    "/admin/:path*",
    "/api/bookings/:path*",
    "/api/admin/:path*",
    "/api/user/:path*",
  ],
};
