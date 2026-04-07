import { createAuthClient } from "better-auth/react"
import { convexClient } from "@convex-dev/better-auth/dist/client/plugins/index.js";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001",
    plugins: [
        convexClient()
    ]
})
