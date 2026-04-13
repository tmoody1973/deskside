import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Use Node.js runtime instead of Edge (Clerk modules not Edge-compatible)
export const runtime = "nodejs";

// All routes are public. Auth is checked in Convex mutations, not middleware.
const isPublicRoute = createRouteMatcher(["/(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  // Everything is public — Clerk just makes auth state available
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
