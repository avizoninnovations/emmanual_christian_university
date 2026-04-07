import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { checkCapability } from "./authHelpers";

/**
 * Internal query to check if a user has a specific capability.
 * This is used by actions that need to verify permissions.
 */
export const checkCapabilityInternal = internalQuery({
  args: {
    sessionId: v.optional(v.string()),
    requiredCapability: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await checkCapability(ctx, args.sessionId, args.requiredCapability);
    if (!user) {
      throw new Error(`Unauthorized: Missing capability ${args.requiredCapability}`);
    }
    return user;
  },
});
