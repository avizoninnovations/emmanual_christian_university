import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

/**
 * Batch enrich a list of documents with related data from another table.
 * Reduces N+1 queries to O(1) additional query.
 * 
 * @param ctx Convex context
 * @param items List of documents to enrich
 * @param idField The field in 'items' containing the related ID
 * @param targetTable The table to fetch related data from
 */
export async function batchEnrich<
    T extends Record<string, any>,
    K extends keyof T,
    TableName extends Parameters<QueryCtx["db"]["get"]>[0] extends Id<infer U> ? U : any
>(
    ctx: QueryCtx | MutationCtx,
    items: T[],
    idField: K,
    targetTable: string
): Promise<Map<string, any>> {
    const ids = [...new Set(items.map(item => item[idField]).filter(Boolean))];

    // Resolve the table name dynamically for the DB call
    const rawResults = await Promise.all(
        ids.map(id => ctx.db.get(id as any))
    );

    return new Map(
        rawResults
            .filter(Boolean)
            .map(doc => [doc!._id as string, doc])
    );
}
