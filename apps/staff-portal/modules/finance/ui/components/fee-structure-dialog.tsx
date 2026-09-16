"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Loader2, Plus, Save, Banknote, Coins } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import { Separator } from "@workspace/ui/components/separator";

const feeSchema = z.object({
  programId: z.string().min(1, "Program is required"),
  periodId: z.string().min(1, "Academic Period is required"),
  currency: z.string().min(1),
  tuitionFee: z.coerce.number().min(0),
  registrationFee: z.coerce.number().min(0),
  libraryFee: z.coerce.number().min(0),
  ictFee: z.coerce.number().min(0),
  activityFee: z.coerce.number().min(0),
  otherFees: z.coerce.number().min(0),
});

type FeeFormValues = z.infer<typeof feeSchema>;

interface FeeStructureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStructure?: any | null;
  onSuccess?: () => void;
}

export const FeeStructureDialog = ({
  open,
  onOpenChange,
  editingStructure,
  onSuccess,
}: FeeStructureDialogProps) => {
  const programs = useQuery(api.academic.getPrograms, {});
  const periods = useQuery(api.academic.getPeriods);
  const createFeeStructure = useMutation(api.finance.createFeeStructure);
  const updateFeeStructure = useMutation(api.finance.updateFeeStructure);

  const form = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      programId: "",
      periodId: "",
      currency: "SSP",
      tuitionFee: 0,
      registrationFee: 0,
      libraryFee: 0,
      ictFee: 0,
      activityFee: 0,
      otherFees: 0,
    },
  });

  useEffect(() => {
    if (editingStructure) {
      form.reset({
        programId: editingStructure.programId,
        periodId: editingStructure.periodId,
        currency: editingStructure.currency || "SSP",
        tuitionFee: editingStructure.tuitionFee || 0,
        registrationFee: editingStructure.registrationFee || 0,
        libraryFee: editingStructure.libraryFee || 0,
        ictFee: editingStructure.ictFee || 0,
        activityFee: editingStructure.activityFee || 0,
        otherFees: editingStructure.otherFees || 0,
      });
    } else {
      form.reset({
        programId: "",
        periodId: "",
        currency: "SSP",
        tuitionFee: 0,
        registrationFee: 0,
        libraryFee: 0,
        ictFee: 0,
        activityFee: 0,
        otherFees: 0,
      });
    }
  }, [editingStructure, form, open]);

  const watchAll = form.watch();
  const calculatedTotal =
    (Number(watchAll.tuitionFee) || 0) +
    (Number(watchAll.registrationFee) || 0) +
    (Number(watchAll.libraryFee) || 0) +
    (Number(watchAll.ictFee) || 0) +
    (Number(watchAll.activityFee) || 0) +
    (Number(watchAll.otherFees) || 0);

  const onSubmit = async (values: z.infer<typeof feeSchema>) => {
    try {
      if (editingStructure) {
        await updateFeeStructure({
          id: editingStructure._id,
          currency: values.currency,
          tuitionFee: values.tuitionFee,
          registrationFee: values.registrationFee,
          libraryFee: values.libraryFee,
          ictFee: values.ictFee,
          activityFee: values.activityFee,
          otherFees: values.otherFees,
        });
        toast.success("Fee structure updated successfully.");
      } else {
        const selectedPeriod = periods?.find((p) => p._id === values.periodId);
        if (!selectedPeriod) {
          toast.error("Selected academic period not found.");
          return;
        }

        await createFeeStructure({
          programId: values.programId as Id<"programs">,
          periodId: values.periodId as Id<"academicPeriods">,
          term: selectedPeriod.term,
          year: selectedPeriod.year,
          currency: values.currency,
          tuitionFee: values.tuitionFee,
          registrationFee: values.registrationFee,
          libraryFee: values.libraryFee,
          ictFee: values.ictFee,
          activityFee: values.activityFee,
          otherFees: values.otherFees,
        });
        toast.success("Fee structure created successfully.");
      }

      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save fee structure.");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Coins className="size-5 text-primary" />
            {editingStructure ? "Edit Fee Structure" : "Define Program Fee Structure"}
          </DialogTitle>
          <DialogDescription>
            Specify semester fees for an academic program. These amounts are automatically applied during semester enrollment and invoicing.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Program Selector */}
              <div className="sm:col-span-2">
                <FormField
                  control={form.control}
                  name="programId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Academic Program</FormLabel>
                      <Select
                        disabled={!!editingStructure}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select program..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-56">
                          {programs?.map((p) => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name} ({p.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Currency */}
              <div>
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SSP">SSP (South Sudanese Pound)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Academic Period */}
            <FormField
              control={form.control}
              name="periodId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Academic Period / Semester</FormLabel>
                  <Select
                    disabled={!!editingStructure}
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {periods?.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name} ({p.year}) — Semester {p.term}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-2" />

            {/* Breakdown Fees */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="tuitionFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tuition Fee ({watchAll.currency})</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Fee</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="libraryFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Library Fee</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ictFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ICT / Lab Fee</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="activityFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student Activity Fee</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="otherFees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other / Examination Fees</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="any" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Calculation Card */}
            <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Total Semester Fee</span>
              <span className="font-mono font-bold text-lg text-primary">
                {watchAll.currency} {calculatedTotal.toLocaleString()}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-primary">
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="size-4" /> Save Fee Structure
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
