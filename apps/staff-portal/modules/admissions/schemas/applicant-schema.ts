import { z } from "zod";

export const applicantSchema = z.object({
  firstName: z.string().trim().min(2, "Enter the first name."),
  surname: z.string().trim().min(2, "Enter the surname."),
  otherName: z.string().trim(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  dateOfBirth: z.string().refine(value => !value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && Date.parse(value) < Date.now()), "Enter a valid date in the past."),
  nationality: z.string().trim().min(2, "Enter the nationality."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a contact phone number."),
  address: z.string().trim(),
  emergencyName: z.string().trim().min(2, "Enter an emergency contact name."),
  emergencyPhone: z.string().trim().min(7, "Enter an emergency phone number."),
  emergencyRelationship: z.string().trim(),
  emergencyEmail: z.union([z.literal(""), z.string().email("Enter a valid email address.")]),
  yearOfEntry: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  programType: z.enum(["Day", "Evening", "Weekend", "Distance"]),
  programId: z.string().min(1, "Select a program."),
  admissionType: z.enum(["National", "Direct"]),
});

export type ApplicantFormValues = z.infer<typeof applicantSchema>;
