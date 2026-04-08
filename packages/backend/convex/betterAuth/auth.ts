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
    baseURL: process.env.SITE_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
        convex({ authConfig }),
        admin(),
    ],
    hooks: {
        before: async (authCtx) => {
            const body = authCtx.body as any;
            const headers = new Headers(authCtx.headers);
            const url = new URL(body?.callbackURL || headers.get("referer") || "http://localhost");
            if (url.pathname.includes("/sign-up")) {
                throw new Error("Self-registration is disabled. Please contact an administrator.");
            }
        }
    }
  } satisfies BetterAuthOptions;
};

// For `auth` CLI
export const options = createAuthOptions({} as GenericCtx<DataModel>);

// Better Auth Instance
export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth(createAuthOptions(ctx));
};
