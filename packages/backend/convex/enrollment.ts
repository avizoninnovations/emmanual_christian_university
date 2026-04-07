import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUser, logAction, checkRateLimit } from "./authHelpers";
import { Id } from "./_generated/dataModel";

// Internal mutation to perform the enrollment transaction
export const enrollApplicantInternal = internalMutation({
    args: {
        sessionId: v.optional(v.optional(v.string())),
        applicantId: v.id("applicants"),
        programId: v.id("programs"),
        // Contact Data (using university terminology)
        contactData: v.object({
            existingContactId: v.optional(v.id("emergencyContacts")),
            newContact: v.optional(v.object({
                name: v.string(),
                relationship: v.string(),
                contact: v.string(),
                email: v.optional(v.string()),
                // Auth (if creating user)
                createAccount: v.boolean(),
                passwordHash: v.optional(v.string()), 
                emailForLogin: v.optional(v.string()),
            })),
        }),
    },
    handler: async (ctx, args) => {
        let user: any = null;
        if (args.sessionId) {
            user = await getAuthUser(ctx, args.sessionId);
            if (!user) return { success: false, error: "You don't have permission to enroll students." };
            const rateLimit = await checkRateLimit(ctx, `enroll_student:${args.sessionId}`, 10, 60);
            if (!rateLimit.success) return rateLimit;
        }

        // 1. Get Applicant & Config
        const applicant = await ctx.db.get(args.applicantId);
        if (!applicant) return { success: false, error: "We couldn't find the applicant record." };

        const config = await ctx.db.query("schoolConfig").first();
        const currentYear = config?.currentYear || new Date().getFullYear();
        const currentSemester = config?.currentSemester || 1;

        // 2. Handle Emergency Contact
        let emergencyContactId: Id<"emergencyContacts">;

        if (args.contactData.existingContactId) {
            emergencyContactId = args.contactData.existingContactId;
        } else if (args.contactData.newContact) {
            const p = args.contactData.newContact;
            let userId: Id<"users"> | undefined = undefined;

            // Create User Account if requested
            if (p.createAccount && p.emailForLogin && p.passwordHash) {
                const existingUser = await ctx.db
                    .query("users")
                    .withIndex("by_email", q => q.eq("email", p.emailForLogin!))
                    .first();

                if (existingUser) return { success: false, error: `A user with the email ${p.emailForLogin} already exists.` };

                const userNames = p.name.split(" ");
                userId = await ctx.db.insert("users", {
                    email: p.emailForLogin,
                    passwordHash: p.passwordHash,
                    firstName: userNames[0] || "Parent",
                    lastName: userNames.slice(1).join(" ") || "Guardian",
                    role: "Guardian",
                    isActive: true,
                    createdAt: Date.now(),
                    contact: p.contact,
                });
            }

            // Create Emergency Contact Record
            emergencyContactId = await ctx.db.insert("emergencyContacts", {
                name: p.name,
                relationship: p.relationship,
                contact: p.contact,
                email: p.email,
                userId: userId,
            });
        } else {
            return { success: false, error: "Please provide contact information to complete enrollment." };
        }

        // 3. Create Student
        const nameParts = applicant.applicantName.split(" ");
        const firstName = nameParts[0] || "Student";
        const lastName = nameParts.slice(1).join(" ") || firstName;

        // Auto-initialize balance based on fee structure
        let initialBalance = 0;
        const feeStructure = await ctx.db
            .query("feeStructures")
            .withIndex("by_program_semester", (q) =>
                q.eq("programId", args.programId).eq("semesterNumber", currentSemester)
            )
            .first();
        
        if (feeStructure) {
            initialBalance = feeStructure.total ?? 0;
        }

        const studentId = await ctx.db.insert("students", {
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            gender: applicant.gender || "Male",
            dateOfBirth: applicant.dateOfBirth || new Date().toISOString(),
            enrollmentDate: new Date().toISOString().split('T')[0],
            programId: args.programId,
            emergencyContactId: emergencyContactId,
            balance: initialBalance,
            status: "Active",
            intakeSemester: currentSemester,
            intakeYear: currentYear,
            currentYearOfStudy: 1,
        });

        // 4. Update Applicant
        await ctx.db.patch(args.applicantId, {
            stage: "Enrolled",
            notes: (applicant.notes || "") + `\nEnrolled as Student ID: ${studentId}`,
        });

        // 5. Create History/Semester Record
        await ctx.db.insert("studentSemesterEnrollments", {
            studentId,
            programId: args.programId,
            semester: currentSemester,
            year: currentYear,
            status: "Active",
            dateEnrolled: new Date().toISOString().split('T')[0],
        });

        if (user) {
            await logAction(ctx, user._id, "ENROLL_STUDENT", `Enrolled ${firstName} ${lastName} from Applicant ${args.applicantId}`);
        }

        return { success: true, studentId };
    }
});

