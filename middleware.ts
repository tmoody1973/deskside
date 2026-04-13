import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk middleware — all routes are public by default.
// Auth is only required for mutations (favorites, playlists, channels).
// The middleware just makes the auth state available.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
