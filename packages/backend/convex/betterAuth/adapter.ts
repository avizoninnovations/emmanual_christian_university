import { createApi } from "@convex-dev/better-auth";
import { createAuthOptions } from "./auth.js";
import schema from "./schema.js";

export const {
  create,
  findOne,
  findMany,
  updateOne,
  updateMany,
  deleteOne,
  deleteMany,
} = createApi(schema, createAuthOptions);
