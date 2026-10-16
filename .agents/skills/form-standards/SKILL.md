---
name: form-standards
description: >-
  Standardizes form validation patterns across the Emmanuel Christian
  University monorepo using react-hook-form, zod schemas, shadcn Form
  primitives, and the shadcn Button component from @workspace/ui.
---

# Form Standards & Validation — Emmanuel Christian University

All input forms across the **ECU** portals (Admin, Student, Finance,
LMS, Library, Inventory) MUST follow strict validation, type safety,
and clean layout patterns using `react-hook-form` and `zod`.

---

## 1. Core Principles

1. **Mandatory `react-hook-form` + `zod`** — Every form must define a
   strongly typed Zod schema and bind to
   `useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })`.
2. **Shadcn Form Primitives** — Use `<Form>`, `<FormField>`,
   `<FormItem>`, `<FormLabel>`, `<FormControl>`, `<FormDescription>`,
   `<FormMessage>` from `@workspace/ui/components/form`.
3. **No `.default()` Zod Mismatches** — Avoid unnecessary `.default()`
   transforms on Zod input fields when input and output types need to
   stay aligned.
4. **Button Integration** — Bind form submit buttons directly to
   `<Button isLoading={form.formState.isSubmitting}>`.
5. **ECU Field Vocabulary** — Use ECU terms: Faculty, Department,
   Program, Course, Semester, Academic Period, Sponsor, Channel
   (cash / m-Gurush / Equity / KCB / Stanbic / bank_deposit),
   Amount (SSP / USD).

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
  FormDescription,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";

// 1. Strongly typed Zod schema (ECU domain terms)
const sponsorFormSchema = z.object({
  name: z.string().min(2, "Sponsor name must be at least 2 characters"),
  code: z.string().min(2, "Code is required").max(10).toUpperCase(),
  category: z.enum(["church", "ngo", "government", "private"]),
  contactPerson: z.string().optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  coveragePercentage: z.coerce
    .number()
    .min(0, "Coverage cannot be negative")
    .max(100, "Coverage cannot exceed 100%"),
});

export type SponsorFormValues = z.infer<typeof sponsorFormSchema>;

interface SponsorFormProps {
  initialValues?: Partial<SponsorFormValues>;
  onSubmit: (values: SponsorFormValues) => Promise<void>;
  onCancel?: () => void;
}

export function SponsorForm({ initialValues, onSubmit, onCancel }: SponsorFormProps) {
  const form = useForm<SponsorFormValues>({
    resolver: zodResolver(sponsorFormSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      code: initialValues?.code ?? "",
      category: initialValues?.category ?? "church",
      contactPerson: initialValues?.contactPerson ?? "",
      contactEmail: initialValues?.contactEmail ?? "",
      contactPhone: initialValues?.contactPhone ?? "",
      coveragePercentage: initialValues?.coveragePercentage ?? 100,
    },
  });

  const handleSubmit = async (values: SponsorFormValues) => {
    try {
      await onSubmit(values);
      form.reset();
    } catch (error) {
      // Server-side ConvexError messages surface via field-level toasts.
      console.error("Failed to submit sponsor form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sponsor Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Diocese of Yei" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sponsor category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="church">Church</SelectItem>
                  <SelectItem value="ngo">NGO</SelectItem>
                  <SelectItem value="government">Government</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="coveragePercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coverage %</FormLabel>
              <FormControl>
                <Input type="number" min={0} max={100} {...field} />
              </FormControl>
              <FormDescription>
                Percentage of fees covered by this sponsor (0–100).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            variant="default"
            isLoading={form.formState.isSubmitting}
          >
            Save Sponsor
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

---

## 3. Common ECU Field Schemas

Reusable Zod fragments for ECU-specific fields. Keep these in
`apps/<portal>/lib/schemas/` so every form imports the same
validation.

```typescript
import * as z from "zod";

// Registration numbers: ECU/YYYY/PROG/NNN
export const registrationNumberSchema = z
  .string()
  .regex(/^ECU\/\d{4}\/[A-Z]{2,5}\/\d{3}$/, "Invalid registration number (expected ECU/YYYY/PROG/NNN)");

// Course code: BBA 101, BAT 102, etc.
export const courseCodeSchema = z
  .string()
  .regex(/^[A-Z]{2,5}\s\d{3}$/, "Invalid course code (e.g. BBA 101)");

// Credit units: integer 1–6 (per ECU NUC standard)
export const creditUnitsSchema = z.coerce.number().int().min(1).max(6);

// Money amount in SSP / USD (integer or 2-decimal)
export const moneySchema = (currency: "SSP" | "USD") =>
  z.coerce
    .number()
    .nonnegative("Amount must be non-negative")
    .multipleOf(currency === "USD" ? 0.01 : 1);

// SSP phone: +211 9XX XXX XXX or 09XX XXX XXX
export const phoneSchema = z
  .string()
  .regex(/^(\+211\s?)?0?9\d{2}\s?\d{3}\s?\d{3}$/, "Invalid South Sudan phone number");
```

---

## 4. Form Layout Rules

1. **Spacing**: `space-y-4` between form fields, `pt-4 border-t
   border-border` to separate the action row from fields.
2. **Action row**: always right-aligned with `flex items-center
   justify-end gap-3`.
3. **Primary button**: `variant="default"` (ECU Maroon).
4. **Destructive button**: `variant="destructive"` — only for delete /
   void forms.
5. **Loading state**: bind to `form.formState.isSubmitting`; never to
   a separate `useState` flag.
6. **Errors**: surface server `ConvexError.message` via a toast at the
   top of the dialog using `sonner`.

---

## 5. Money & Date Conventions

- **Currency display**: `value.toLocaleString()` (locale-aware
  thousand separators) + currency code suffix, e.g. `1,250,000 SSP`.
- **Date input**: use `Input type="date"` (ISO `YYYY-MM-DD`).
- **Date display**: format via `Intl.DateTimeFormat("en-GB", { day:
  "2-digit", month: "short", year: "numeric" })` → "30 Sep 2026".
- **Receipt number**: pattern is `ECU-REC-YYYY-XXXXX` (sequential).
  Never hand-roll — it is generated server-side.