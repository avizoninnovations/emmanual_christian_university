import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import type { GenericCtx } from "@convex-dev/better-auth/utils";
import type { BetterAuthOptions } from "better-auth";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { components, internal } from "../_generated/api.js";
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
export const createAuthOptions = (ctx: any) => {
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
    databaseHooks: {
        session: {
            create: {
                after: async (session: any) => {
                    // Resolve user details for a readable log
                    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
                        model: "user",
                        where: [{ field: "_id", value: session.userId, operator: "eq" }],
                    }) as any;

                    // ── Geolocation Resolution ──
                    let location = "Unknown";
                    if (session.ipAddress && !session.ipAddress.match(/^(127\.0\.0\.1|::1|localhost)$/)) {
                        try {
                            const response = await fetch(`http://ip-api.com/json/${session.ipAddress}?fields=city,country,status`);
                            const geo = await response.json();
                            if (geo.status === "success") {
                                location = `${geo.city}, ${geo.country}`;
                            } else {
                                location = "Remote (Location Blocked)";
                            }
                        } catch (e) {
                            location = "Remote (Resolution Failed)";
                        }
                    } else if (session.ipAddress) {
                        location = "Local Environment";
                    }

                    await ctx.runMutation(internal.system._logAction, {
                        userId: session.userId,
                        userName: user?.name || "Unknown",
                        userEmail: user?.email || "N/A",
                        action: "SIGN_IN",
                        resource: "auth",
                        details: `User signed in. Session: ${session.token.slice(0, 8)}...`,
                        ipAddress: session.ipAddress,
                        userAgent: session.userAgent,
                        location,
                    });
                }
            },
            delete: {
                after: async (session: any) => {
                    // Resolve user details for a readable log
                    const user = await ctx.runQuery(components.betterAuth.adapter.findOne, {
                        model: "user",
                        where: [{ field: "_id", value: session.userId, operator: "eq" }],
                    }) as any;

                    await ctx.runMutation(internal.system._logAction, {
                        userId: session.userId,
                        userName: user?.name || "Unknown",
                        userEmail: user?.email || "N/A",
                        action: "SIGN_OUT",
                        resource: "auth",
                        details: `User signed out or session revoked.`,
                        ipAddress: session.ipAddress,
                        userAgent: session.userAgent,
                    });
                }
            }
        },
        user: {
            create: {
                after: async (user: any) => {
                    await ctx.runMutation(internal.system._logAction, {
                        userId: user.id,
                        userName: user.name,
                        userEmail: user.email,
                        action: "SIGN_UP",
                        resource: "auth",
                        details: `New user account created: ${user.email}`
                    });
                }
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
