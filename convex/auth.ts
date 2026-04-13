import { QueryCtx, MutationCtx } from "./_generated/server";

/**
 * Server-side auth helper. NEVER accept userId from the client.
 * Always derive identity from ctx.auth.getUserIdentity().
 *
 * Returns the tokenIdentifier (stable across sessions) as userId.
 * Throws if not authenticated.
 */

export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.tokenIdentifier;
}

export async function getOptionalAuthUserId(
  ctx: QueryCtx | MutationCtx
): Promise<string | null> {
  const identity = await ctx.auth.getUserIdentity();
  return identity?.tokenIdentifier ?? null;
}
