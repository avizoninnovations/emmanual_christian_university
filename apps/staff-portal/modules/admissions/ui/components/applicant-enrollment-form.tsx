"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import * as z from "zod";
import { api } from "@workspace/backend/_generated/api";
import type { Id } from "@workspace/backend/_generated/dataModel";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { Button } from "@workspace/ui/components/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";

const enrollmentSchema = z.object({
  periodId: z.string().min(1, "Choose the applicant's intake semester."),
  registrationNumber: z.string().trim().min(1, "Enter the student number."),
  accessNumber: z.string().trim().min(1, "Enter the access number."),
  yearOfStudy: z.coerce.number().int().min(1).max(10),
});
type EnrollmentValues = z.infer<typeof enrollmentSchema>;

export function ApplicantEnrollmentForm({
  applicantId,
  term,
  year,
}: {
  applicantId: Id<"applicants">;
  term: number;
  year: number;
}) {
  const periods = useQuery(api.admissionsEnrollment.getEnrollmentPeriods, {});
  const enrollApplicant = useMutation(
    api.admissionsEnrollment.enrollReportedApplicant,
  );
  const form = useForm<EnrollmentValues>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      periodId: "",
      registrationNumber: "",
      accessNumber: "",
      yearOfStudy: 1,
    },
  });
  const intakePeriods = (periods ?? []).filter(
    (period) =>
      period.term === term &&
      period.year === year &&
      ["active", "upcoming"].includes(period.status),
  );

  async function onSubmit(values: EnrollmentValues) {
    try {
      await enrollApplicant({
        applicantId,
        periodId: values.periodId as Id<"academicPeriods">,
        registrationNumber: values.registrationNumber,
        accessNumber: values.accessNumber,
        yearOfStudy: values.yearOfStudy,
      });
      toast.success(
        "Student profile created and semester enrollment recorded.",
      );
    } catch (error) {
      toast.error(
        getUserFacingErrorMessage(
          error,
          "Could not complete student enrollment.",
        ),
      );
    }
  }

  return (
    <div className="space-y-3 rounded-sm bg-muted/30 p-4">
      <div>
        <h4 className="text-sm font-semibold">
          Create student profile and enroll for intake semester
        </h4>
        <p className="mt-1 text-xs text-muted-foreground">
          A sign-in account must already exist under the applicant’s email.
          Course units remain for student course registration.
        </p>
      </div>
      {periods !== undefined && intakePeriods.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Create an active or upcoming Semester {term} {year} in the Academic
          Calendar to complete enrollment.
        </p>
      )}
      {intakePeriods.length > 0 && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-3 sm:grid-cols-2"
          >
            <FormField
              control={form.control}
              name="periodId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Intake semester</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="rounded-sm">
                        <SelectValue placeholder="Choose intake semester" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {intakePeriods.map((period) => (
                        <SelectItem key={period._id} value={period._id}>
                          {period.name} {period.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <EnrollmentField
              form={form}
              name="registrationNumber"
              label="Student number"
              placeholder="S26/ECU/PROGRAM/001"
            />
            <EnrollmentField
              form={form}
              name="accessNumber"
              label="Access number"
              placeholder="ECU0001"
            />
            <EnrollmentField
              form={form}
              name="yearOfStudy"
              label="Year of study"
              type="number"
            />
            <div className="flex items-end justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Enrolling…"
                  : "Create student and enroll"}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </div>
  );
}

function EnrollmentField({
  form,
  name,
  label,
  placeholder,
  type = "text",
}: {
  form: ReturnType<typeof useForm<EnrollmentValues>>;
  name: "registrationNumber" | "accessNumber" | "yearOfStudy";
  label: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              min={type === "number" ? 1 : undefined}
              className="rounded-sm"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
