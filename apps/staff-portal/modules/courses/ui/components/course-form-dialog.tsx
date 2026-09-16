"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { toast } from "sonner";
import { Id } from "@workspace/backend/_generated/dataModel";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Textarea } from "@workspace/ui/components/textarea";
import { Loader2 } from "lucide-react";

const courseSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters").toUpperCase(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  creditUnits: z.coerce.number().min(1, "Min 1 credit unit").max(10, "Max 10 credit units"),
  departmentId: z.string().min(1, "Please select a department"),
  programId: z.string().min(1, "Please select a program"),
  yearOfStudy: z.coerce.number().min(1).max(5),
  semester: z.coerce.number().min(1).max(2),
  status: z.enum(["active", "inactive"]),
  description: z.string().optional(),
});

type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseToEdit?: any | null;
}

export function CourseFormDialog({
  open,
  onOpenChange,
  courseToEdit,
}: CourseFormDialogProps) {
  const departments = useQuery(api.academic.getDepartments, {}) || [];
  const programs = useQuery(api.academic.getPrograms, {}) || [];

  const createCourse = useMutation(api.courses.createCourse);
  const updateCourse = useMutation(api.courses.updateCourse);

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      code: "",
      title: "",
      creditUnits: 3,
      departmentId: "",
      programId: "",
      yearOfStudy: 1,
      semester: 1,
      status: "active",
      description: "",
    },
  });

  useEffect(() => {
    if (courseToEdit) {
      form.reset({
        code: courseToEdit.code,
        title: courseToEdit.title,
        creditUnits: courseToEdit.creditUnits,
        departmentId: courseToEdit.departmentId,
        programId: courseToEdit.programId,
        yearOfStudy: courseToEdit.yearOfStudy,
        semester: courseToEdit.semester,
        status: courseToEdit.status === "inactive" ? "inactive" : "active",
        description: courseToEdit.description || "",
      });
    } else {
      form.reset({
        code: "",
        title: "",
        creditUnits: 3,
        departmentId: departments[0]?._id ?? "",
        programId: programs[0]?._id ?? "",
        yearOfStudy: 1,
        semester: 1,
        status: "active",
        description: "",
      });
    }
  }, [courseToEdit, open]);

  const onSubmit = async (values: CourseFormValues) => {
    try {
      if (courseToEdit) {
        await updateCourse({
          id: courseToEdit._id as Id<"courses">,
          title: values.title.trim(),
          creditUnits: values.creditUnits,
          yearOfStudy: values.yearOfStudy,
          semester: values.semester,
          status: values.status,
          description: values.description?.trim(),
        });
        toast.success("Course updated successfully");
      } else {
        await createCourse({
          code: values.code.trim().toUpperCase(),
          title: values.title.trim(),
          creditUnits: values.creditUnits,
          departmentId: values.departmentId as Id<"departments">,
          programId: values.programId as Id<"programs">,
          yearOfStudy: values.yearOfStudy,
          semester: values.semester,
          description: values.description?.trim(),
        });
        toast.success("Course created successfully");
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Failed to save course");
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {courseToEdit ? "Edit Course" : "Add New Course"}
          </DialogTitle>
          <DialogDescription>
            Configure course curriculum details, credit load, and academic department.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. BCS 1101" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="creditUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Credit Units</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={10} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Introduction to Programming with C" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d._id} value={d._id}>
                            {d.name} ({d.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="programId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((p: any) => (
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="yearOfStudy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year of Study</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                        <SelectItem value="3">Year 3</SelectItem>
                        <SelectItem value="4">Year 4</SelectItem>
                        <SelectItem value="5">Year 5</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(Number(val))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief overview of course syllabus, prerequisites, and learning objectives..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {courseToEdit ? "Update Course" : "Create Course"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
