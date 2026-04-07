import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import bcrypt from "bcryptjs";

/**
 * Internal action to hash a password.
 * Used by administrative mutations (seed, staff creation).
 */
export const hashPasswordAction = internalAction({
  args: {
    password: v.string(),
  },
  handler: async (_ctx, args) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(args.password, salt);
    return hash;
  },
});
