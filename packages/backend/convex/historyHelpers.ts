import { Id } from "./_generated/dataModel";

/**
 * Retrieves the specific student roster for a program during a given academic semester and year.
 * - Current period: Returns active students currently in the program.
 * - Past period: Checks `studentSemesterEnrollments` for exact snapshots.
 */
export async function getStudentsForPeriod(ctx: any, programId: Id<"programs"> | string, semester: number, year: number): Promise<any[]> {
    const config = await ctx.db.query("schoolConfig").first();
    const currentYear = config?.currentYear || new Date().getFullYear();
    const currentSemester = config?.currentSemester || 1;
    
    const isHistorical = (semester !== currentSemester) || (year !== currentYear);
    
    if (isHistorical) {
        const history = await ctx.db
            .query("studentSemesterEnrollments")
            .withIndex("by_program_period", (q: any) => q.eq("programId", programId as any).eq("semester", semester).eq("year", year))
            .collect();
            
        // Resolve exactly which student records those belong to.
        const studentDocs = await Promise.all(history.map((h:any) => ctx.db.get(h.studentId)));
        return studentDocs.filter(Boolean) as any[];
    }
    
    // Current Period fallback
    return await ctx.db
        .query("students")
        .withIndex("by_program", (q:any) => q.eq("programId", programId as any))
        .filter((q:any) => q.eq(q.field("status"), "Active"))
        .collect() as any[];
}
