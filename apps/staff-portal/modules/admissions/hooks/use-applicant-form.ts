"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { toast } from "sonner";
import { applicantSchema, type ApplicantFormValues } from "../schemas/applicant-schema";

export function useApplicantForm(onSaved: () => void) {
  const programs = useQuery(api.academic.getPrograms, {}) ?? [];
  const activePeriod = useQuery(api.calendar.getActivePeriod);
  const createApplicant = useMutation(api.admissions.createApplicant);
  const form = useForm<ApplicantFormValues>({
    resolver: zodResolver(applicantSchema),
    defaultValues: {
      firstName: "", surname: "", otherName: "", gender: "male", dateOfBirth: "",
      nationality: "South Sudanese", email: "", phone: "", address: "",
      emergencyName: "", emergencyPhone: "", emergencyRelationship: "", emergencyEmail: "",
      yearOfEntry: new Date().getFullYear(), programType: "Day", programId: "", admissionType: "National",
    },
  });
  const submit = form.handleSubmit(async values => {
    if (!activePeriod) { toast.error("Set an active academic period before recording an application."); return; }
    const program = programs.find(item => item._id === values.programId);
    if (!program) { form.setError("programId", { message: "Select an available program." }); return; }
    try {
      await createApplicant({
        name: [values.firstName, values.otherName, values.surname].filter(Boolean).join(" "),
        firstName: values.firstName, surname: values.surname, otherName: values.otherName || undefined,
        gender: values.gender, dateOfBirth: values.dateOfBirth || undefined, nationality: values.nationality,
        email: values.email, phone: values.phone, address: values.address || undefined,
        emergencyContact: { name: values.emergencyName, phone: values.emergencyPhone, relationship: values.emergencyRelationship || undefined, email: values.emergencyEmail || undefined },
        yearOfEntry: values.yearOfEntry, programType: values.programType, programId: program._id,
        admissionType: values.admissionType, term: activePeriod.term, year: activePeriod.year,
      });
      toast.success("Application recorded with personal, academic, and contact details.");
      onSaved();
    } catch (error) { toast.error(getUserFacingErrorMessage(error, "Unable to record this application.")); }
  });
  return { form, programs, submit, activePeriod };
}
