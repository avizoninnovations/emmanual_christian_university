import type { MutationCtx } from "../_generated/server.js";
import type { Doc } from "../_generated/dataModel.js";
import { logAction } from "../audit_logger.js";

type Event = Omit<Doc<"academicEvents">, "_id" | "_creationTime" | "createdAt" | "updatedAt">;
export async function academicEvent(ctx: MutationCtx, event: Event) {
  const now = Date.now();
  await ctx.db.insert("academicEvents", { ...event, createdAt: now, updatedAt: now });
  await logAction(ctx, { action: event.action, resource: "academic", details: event.details });
}
