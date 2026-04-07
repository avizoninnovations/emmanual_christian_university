import { v } from "convex/values";
import { internalAction } from "./_generated/server";

/**
 * Internal action to hash a password.
 * Legacy bridge for the Admissions system.
 */
export const hashPasswordAction = internalAction({
  args: {
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    // Legacy placeholder: real hashing happens via Better Auth's adapter
    // but the Admissions action expects a hash back to pass to enrollment mutations.
    // In a real environment, we would use a library like bcrypt here.
    return `hash:${args.password}`;
  },
});
