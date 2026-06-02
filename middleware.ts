export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/((?!login|forgot-password|reset-password|api/auth|api/cron|api/forgot-password|api/reset-password|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)",
  ],
};
