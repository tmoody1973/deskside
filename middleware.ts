import { clerkMiddleware } from "@clerk/nextjs/server";

// Use Node.js runtime instead of Edge (Clerk modules not Edge-compatible)
export const runtime = "nodejs";

// Clerk middleware — all routes are public by default.
// Auth is only required for mutations (favorites, playlists, channels).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
