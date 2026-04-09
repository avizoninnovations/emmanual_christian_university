"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Loader2, Plus, Save, Banknote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@workspace/ui/components/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@workspace/ui/components/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@workspace/ui/components/sheet";
import { Separator } from "@workspace/ui/components/separator";

const feeSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  periodId: z.string().min(1, "Academic Period is required"),
  tuitionFee: z.coerce.number().min(0),
  registrationFee: z.coerce.number().min(0),
  libraryFee: z.coerce.number().min(0),
  ictFee: z.coerce.number().min(0),
  activityFee: z.coerce.number().min(0),
});

interface FeeStructureFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeeStructureFormSheet = ({ open, onOpenChange }: FeeStructureFormSheetProps) => {
  const programs = useQuery(api.academic.getPrograms, {});
  const periods = useQuery(api.academic.getPeriods);
  const createFeeStructure = useMutation(api.finance.createFeeStructure);

  const form = useForm<z.infer<typeof feeSchema>>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      programId: "",
      periodId: "",
      tuitionFee: 0,
      registrationFee: 0,
      libraryFee: 0,
      ictFee: 0,
      activityFee: 0,
    },
  });

  const onSubmit = async (values: z.infer<typeof feeSchema>) => {
    try {
      // Find the selected period to extract term/year
      const selectedPeriod = periods?.find(p => p._id === values.periodId);
      if (!selectedPeriod) {
        toast.error("Selected academic period not found.");
        return;
      }

      await createFeeStructure({
        programId: values.programId as any,
        periodId: values.periodId as any,
        term: selectedPeriod.term,
        year: selectedPeriod.year,
        tuitionFee: values.tuitionFee,
        registrationFee: values.registrationFee,
        libraryFee: values.libraryFee,
        ictFee: values.ictFee,
        activityFee: values.activityFee,
      });
      toast.success("Fee structure defined successfully.");
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to create fee structure");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[540px] overflow-y-auto">
        <SheetHeader className="space-y-1">
          <SheetTitle className="text-2xl flex items-center gap-2">
            <Banknote className="size-6 text-primary" />
            New Fee Structure
          </SheetTitle>
          <SheetDescription>
            Define the costs for a specific program and academic period.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
            <div className="space-y-4">
              <FormField control={form.control} name="programId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Program</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select program..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs?.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name} ({p.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="periodId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Period</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Select period..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {periods?.map(p => (
                        <SelectItem key={p._id} value={p._id}>{p.name} · {p.year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <Separator className="my-6" />
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Fee Breakdown (UGX)</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField control={form.control} name="tuitionFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tuition Fee</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="registrationFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Fee</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="libraryFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Library Fee</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="ictFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>ICT Fee</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="activityFee" render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Fee</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="pt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-11 px-6">Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-11 px-8 gap-2">
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                Save Structure
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};
