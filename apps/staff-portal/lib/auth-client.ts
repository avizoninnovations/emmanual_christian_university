import { createAuthClient } from "better-auth/react"
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3004",
    plugins: [
        convexClient(),
        adminClient()
    ]
})
