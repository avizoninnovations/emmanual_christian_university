import {
  customMutation,
} from "convex-helpers/server/customFunctions";
import { 
  mutation as mutationBase, 
  internalMutation as internalMutationBase,
  MutationCtx, 
} from "../_generated/server";
import { TableNames, Id } from "../_generated/dataModel";

/**
 * ─────────────────────────────────────────────────────────
 * SIMPLIFIED DATABASE WRITER WRAPPER
 * ─────────────────────────────────────────────────────────
 * This interface provides a "loosened" version of the DatabaseWriter.
 * It allows calling `insert`, `patch`, and `replace` without manually 
 * specifying `createdAt` or `updatedAt`, which are handled by the proxy.
 * 
 * We use a simpler structural approach here to avoid the recursive type 
 * checked errors encountered with more complex mapped types.
 */
export interface ECUDatabaseWriter extends Omit<MutationCtx["db"], "insert" | "patch" | "replace"> {
  insert(table: TableNames, value: any): Promise<Id<any>>;
  patch(id: Id<any>, value: any): Promise<void>;
  replace(id: Id<any>, value: any): Promise<void>;
}

/**
 * The mutation context returned to all ECU backend logic.
 * Structurally compatible with the original MutationCtx.
 */
export interface ECUMutationCtx extends Omit<MutationCtx, "db"> {
  db: ECUDatabaseWriter;
}

/**
 * Shared logic to wrap the db object with automatic timestamp injection.
 */
function wrapDb(ctx: MutationCtx): ECUDatabaseWriter {
  const now = Date.now();
  
  return {
    ...ctx.db,
    
    insert: async (table: string, value: any) => {
      return await ctx.db.insert(table as TableNames, {
        ...value,
        createdAt: now,
        updatedAt: now,
      });
    },

    patch: async (id: any, value: any) => {
      return await ctx.db.patch(id, {
        ...value,
        updatedAt: now,
      });
    },

    replace: async (id: any, value: any) => {
      return await ctx.db.replace(id, {
        ...value,
        updatedAt: now,
      });
    },
  } as any;
}

/**
 * ─────────────────────────────────────────────────────────
 * ECU CUSTOM MUTATION WRAPPERS
 * ─────────────────────────────────────────────────────────
 */

export const mutation = customMutation(mutationBase, {
  args: {},
  input: async (ctx) => {
    return {
      ctx: {
        ...ctx,
        db: wrapDb(ctx),
      } as ECUMutationCtx,
      args: {},
    };
  },
});

export const internalMutation = customMutation(internalMutationBase, {
  args: {},
  input: async (ctx) => {
    return {
      ctx: {
        ...ctx,
        db: wrapDb(ctx),
      } as ECUMutationCtx,
      args: {},
    };
  },
});
