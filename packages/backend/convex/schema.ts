import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tables as authTables } from "./betterAuth/schema.js";

export default defineSchema({
  ...authTables,
  // Add any other existing tables for your university app below:
});

