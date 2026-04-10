import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { components } from "../_generated/api.js";
import type { DataModel } from "../_generated/dataModel.js";
import authConfig from "../auth.config.js";
import schema from "./schema.js";

// Better Auth Component
export const authComponent = createClient<DataModel, typeof schema>(
  // @ts-ignore
  components.betterAuth,
  {
    local: { schema },
    verbose: false,
  },
);

// Better Auth Options
export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    appName: "Emmanuel Christian University",
    baseURL: process.env.SITE_URL || "http://localhost:3004",
    secret: process.env.BETTER_AUTH_SECRET || "87h2gks9f2kxl09z1m4p6q8r3t5v7y9x",
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
        convex({ authConfig }),
        admin(),
    ],
    events: {
        session: {
            create: async (data: { user: any; session: any }, _authCtx: any) => {
                const { user } = data;
                // @ts-ignore
                await ctx.runMutation(internal.system._logAction, {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    action: "SIGN_IN",
                    resource: "auth",
                    details: `User signed in successfully. Session created.`
                });
            },
            revoked: async (data: { user: any; session: any }, _authCtx: any) => {
                const { user } = data;
                // @ts-ignore
                await ctx.runMutation(internal.system._logAction, {
                    userId: user.id,
                    userName: user.name,
                    userEmail: user.email,
                    action: "SIGN_OUT",
                    resource: "auth",
                    details: `User signed out. Session revoked.`
                });
            }
        }
    }
  } as any;
};

// For `auth` CLI
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
