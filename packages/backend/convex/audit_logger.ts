import { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Reusable helper to log an administrative action.
 * Fetches the current user's identity and runs the internal logging mutation.
 * If no user is authenticated (e.g. system task), it logs as 'System'.
 */
export async function logAction(
  ctx: MutationCtx,
  args: {
    action: string;
    resource: string;
    details: string;
  }
) {
  const identity = await ctx.auth.getUserIdentity();
  
  const userId = identity?.subject ?? "system";
  const userName = identity?.name ?? "System";
  const userEmail = identity?.email ?? "system@university.edu";

  await ctx.runMutation(internal.system._logAction, {
    userId,
    userName,
    userEmail,
    action: args.action,
    resource: args.resource,
    details: args.details,
  });
}
