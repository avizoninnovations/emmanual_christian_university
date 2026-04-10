import { internalMutation } from "./lib/mutations";
import { v } from "convex/values";

/**
 * ─────────────────────────────────────────────────────────
 * SYSTEM-WIDE DATA MIGRATION: Timestamps
 * ─────────────────────────────────────────────────────────
 * This internal mutation retroactively adds `createdAt` and `updatedAt` 
 * to any existing records that were created before the new automated 
 * system was implemented.
 * 
 * Usage: 
 * Run from the Convex dashboard or via a CLI action.
 */

const TABLES = [
  "staffProfiles",
  "faculties",
  "departments",
  "programs",
  "academicPeriods",
  "applicants",
  "students",
  "feeStructures",
  "studentLedger",
  "transactions",
  "gradingScales",
  "assessmentBlocks",
  "books",
  "loans",
  "auditLogs",
  "systemRoles",
] as const;

export const migrateTimestamps = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let totalPatched = 0;
    const stats: Record<string, number> = {};

    for (const table of TABLES) {
      const records = await ctx.db.query(table).collect();
      let patchedInTable = 0;

      for (const record of records) {
        // Only patch if one of the fields is missing
        const isMissingTimestamps = (record as any).createdAt === undefined || (record as any).updatedAt === undefined;
        const isLegacyAudit = table === "auditLogs" && (record as any).timestamp !== undefined;
        const isMissingStaffId = table === "staffProfiles" && (record as any).staffId === undefined;

        if (isMissingTimestamps || isLegacyAudit || isMissingStaffId) {
          const updates: any = {};
          
          if (isMissingTimestamps) {
            updates.createdAt = (record as any).createdAt ?? now;
            updates.updatedAt = (record as any).updatedAt ?? now;
          }
          
          // Generate a default staff ID if missing (e.g. ECU-3921)
          if (isMissingStaffId) {
            const random = Math.floor(1000 + Math.random() * 9000);
            updates.staffId = `ECU-${random}`;
          }
          
          // Delete legacy timestamp field from auditLogs
          if (isLegacyAudit) {
            updates.timestamp = undefined; // Convex patch with 'undefined' unsets the field
          }

          await ctx.db.patch(record._id, updates);
          patchedInTable++;
        }
      }
      
      stats[table] = patchedInTable;
      totalPatched += patchedInTable;
    }

    // --- PHASE 2: Sanitize Audit Log Details ---
    const logs = await ctx.db.query("auditLogs").collect();
    let logsSanitized = 0;
    for (const log of logs) {
      if (log.details.match(/[a-z0-9]{20,}/i)) { // Look for long IDs
        // Simplistic sanitizer: replace IDs with "Personnel/Record"
        const cleanDetails = log.details.replace(/[a-z0-9]{20,}/gi, (match) => "PERSONNEL_RECORD");
        if (cleanDetails !== log.details) {
          await ctx.db.patch(log._id, { details: cleanDetails });
          logsSanitized++;
        }
      }
    }

    return {
      message: "Timestamp & Log sanitation completed successfully.",
      totalRecordsPatched: totalPatched,
      auditLogsSanitized: logsSanitized,
      perTableBreakdown: stats,
    };
  },
});
