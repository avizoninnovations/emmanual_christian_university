---
name: form-standards
description: >-
  Standardizes form validation patterns across School Manager Uganda using react-hook-form, zod schemas, shadcn Form primitives, and SoftButton.
---

# Form Standards & Validation Guidelines

All input forms in **School Manager Uganda** MUST follow strict validation, type safety, and clean layout patterns using `react-hook-form` and `zod`.

---

## 1. Core Principles

1. **Mandatory `react-hook-form` + `zod`**: Every form must define a strongly typed Zod schema and bind to `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })`.
2. **Shadcn Form Primitives**: Use `<Form>`, `<FormField>`, `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormMessage>` from `@/components/ui/form`.
3. **No `.default()` Zod Mismatches**: Avoid unnecessary `.default()` transforms on Zod input fields when input and output types need to stay aligned.
4. **SoftButton Integration**: Bind form submission buttons directly to `<SoftButton isLoading={form.formState.isSubmitting}>`.

---

## 2. Standard Form Component Pattern

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SoftSelect } from "@/components/ui/SoftSelect";
import { SoftButton } from "@/components/ui/SoftButton";

// 1. Strongly Typed Zod Schema
const studentFormSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  gender: z.enum(["MALE", "FEMALE"]),
  classId: z.string().min(1, "Please select a class"),
  tuitionFeeUGX: z.coerce.number().min(0, "Amount must be a non-negative number"),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;

interface StudentFormProps {
  initialValues?: Partial<StudentFormValues>;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function StudentForm({ initialValues, onSubmit, onCancel }: StudentFormProps) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      fullName: initialValues?.fullName ?? "",
      gender: initialValues?.gender ?? "MALE",
      classId: initialValues?.classId ?? "",
      tuitionFeeUGX: initialValues?.tuitionFeeUGX ?? 0,
    },
  });

  const handleSubmit = async (values: StudentFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      console.error("Failed to submit form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Mukasa John" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="classId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Class</FormLabel>
              <FormControl>
                <SoftSelect
                  options={[
                    { value: "p1", label: "Primary 1" },
                    { value: "p2", label: "Primary 2" },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select class"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {onCancel && (
            <SoftButton type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </SoftButton>
          )}
          <SoftButton
            type="submit"
            variant="primary"
            isLoading={form.formState.isSubmitting}
          >
            Save Record
          </SoftButton>
        </div>
      </form>
    </Form>
  );
}
```
