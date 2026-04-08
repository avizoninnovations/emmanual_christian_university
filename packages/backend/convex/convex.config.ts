import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config.js";

const app = defineApp();

app.use(betterAuth);

export default app;
