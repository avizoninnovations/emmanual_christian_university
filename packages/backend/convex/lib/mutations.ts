import { customMutation } from "convex-helpers/server/customFunctions";
import {
  mutation as mutationBase,
  internalMutation as internalMutationBase,
  MutationCtx,
} from "../_generated/server";
import { TableNames, Id } from "../_generated/dataModel";

export type AuditActionInput = { action: string; resource: string; details: string };

export interface MutationAuditState {
  recordExplicitAction(input: AuditActionInput): Promise<boolean>;
  recordWrite(operation: string, resource: string): Promise<void>;
}

/** Database writer with automatic timestamp and mutation-audit handling. */
export interface ECUDatabaseWriter extends Omit<MutationCtx["db"], "insert" | "patch" | "replace" | "delete"> {
  insert(table: TableNames, value: any): Promise<Id<any>>;
  patch(id: Id<any>, value: any): Promise<void>;
  replace(id: Id<any>, value: any): Promise<void>;
  delete(id: Id<any>): Promise<void>;
}

export interface ECUMutationCtx extends Omit<MutationCtx, "db"> {
  db: ECUDatabaseWriter;
  auditState?: MutationAuditState;
}

function createMutationAuditState(ctx: MutationCtx): MutationAuditState {
  let logId: Id<"auditLogs"> | null = null;
  let identity: ReturnType<MutationCtx["auth"]["getUserIdentity"]> | null = null;
  let explicit: AuditActionInput | null = null;
  const explicitKeys = new Set<string>();
  const operations = new Set<string>();

  const writeLog = async (fields: AuditActionInput) => {
    if (!logId) {
      identity ??= ctx.auth.getUserIdentity();
      const user = await identity;
      const now = Date.now();
      logId = await ctx.db.insert("auditLogs", {
        userId: user?.subject ?? "system",
        userName: user?.name ?? "System",
        userEmail: user?.email ?? "system@university.edu",
        ...fields,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }
    await ctx.db.patch(logId, { ...fields, updatedAt: Date.now() });
  };

  return {
    async recordWrite(operation, resource) {
      if (resource === "auditLogs") return;
      const key = `${operation} ${resource}`;
      if (operations.has(key)) return;
      operations.add(key);
      if (explicit) return;
      const resources = [...new Set([...operations].map(item => item.slice(item.indexOf(" ") + 1)))];
      await writeLog({
        action: "DATA_CHANGE",
        resource: resources.length === 1 ? resources[0]! : "multiple",
        details: [...operations].join("; "),
      });
    },
    async recordExplicitAction(input) {
      const key = `${input.action}|${input.resource}`;
      if (explicitKeys.has(key)) return true;
      explicitKeys.add(key);
      if (!explicit) explicit = input;
      else explicit = {
        action: "MULTIPLE_ACTIONS",
        resource: "multiple",
        details: `Multiple actions occurred in one operation: ${[explicit.action, input.action].join(", ")}. ${input.details}`,
      };
      await writeLog(explicit);
      return true;
    },
  };
}

function wrapDb(ctx: MutationCtx, auditState?: MutationAuditState): ECUDatabaseWriter {
  const now = Date.now();

  return {
    ...ctx.db,
    insert: async (table: TableNames, value: any) => {
      const id = await ctx.db.insert(table, { ...value, createdAt: now, updatedAt: now });
      if (table !== "auditLogs") await auditState?.recordWrite("CREATE", table);
      return id;
    },
    patch: async (id: any, value: any) => {
      await ctx.db.patch(id, { ...value, updatedAt: now });
      await auditState?.recordWrite("UPDATE", "records");
    },
    replace: async (id: any, value: any) => {
      await ctx.db.replace(id, { ...value, createdAt: now, updatedAt: now });
      await auditState?.recordWrite("REPLACE", "records");
    },
    delete: async (id: any) => {
      await ctx.db.delete(id);
      await auditState?.recordWrite("DELETE", "records");
    },
  } as any;
}

export const mutation = customMutation(mutationBase, {
  args: {},
  input: async (ctx) => {
    const auditState = createMutationAuditState(ctx);
    return { ctx: { ...ctx, db: wrapDb(ctx, auditState), auditState } as ECUMutationCtx, args: {} };
  },
});

export const internalMutation = customMutation(internalMutationBase, {
  args: {},
  input: async (ctx) => ({ ctx: { ...ctx, db: wrapDb(ctx) } as ECUMutationCtx, args: {} }),
});
