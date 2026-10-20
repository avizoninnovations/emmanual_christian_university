"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Id } from "@workspace/backend/_generated/dataModel";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@workspace/ui/components/alert-dialog";
import { ArrowLeft, Check, Clock3, Download, FileUp, Search, Save, Send, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { StaffDataSkeleton } from "@/modules/dashboard/ui/components/staff-data-skeleton";
import { useClassResultsEntry, type StudentFilter } from "@/modules/marks/hooks/use-class-results-entry";
import { ClassResultsTable } from "@/modules/marks/ui/components/class-results-table";

const filters: { key: StudentFilter; title: string }[] = [
  { key: "all", title: "All Students" },
  { key: "incomplete", title: "Missing Marks" },
  { key: "complete", title: "Complete" },
  { key: "passed", title: "Passed" },
  { key: "below-pass", title: "Below Pass" },
];

export function ClassResultsEntryView({ courseId }: { courseId: Id<"courses"> }) {
  const entry = useClassResultsEntry(courseId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  if (entry.isLoading) return <StaffDataSkeleton label="class results" />;
  if (!entry.gradebook) return <div className="p-6 text-sm text-muted-foreground">No active Semester is available for mark entry.</div>;

  const { gradebook, course, students, marks, filter, setFilter, search, setSearch, dirty, saving, submitting, isLocked } = entry;
  const countFor = (key: StudentFilter) => students.filter((student) => {
    const values = marks.get(student.studentId);
    const cw = values?.coursework ?? student.courseworkMarks;
    const exam = values?.exam ?? student.examMarks;
    const total = Number(cw) + Number(exam);
    if (key === "incomplete") return cw === 0 || cw === "" || exam === 0 || exam === "";
    if (key === "complete") return cw !== 0 && cw !== "" && exam !== 0 && exam !== "";
    if (key === "passed") return total >= 60;
    if (key === "below-pass") return total > 0 && total < 60;
    return true;
  }).length;

  const importFile = async (file?: File) => {
    if (!file) return;
    const imported = entry.importCsv(await file.text());
    toast[imported ? "success" : "error"](imported
      ? `Imported marks for ${imported} students. Save the draft to keep them.`
      : "No valid rows found. Use Registration Number, Coursework, Exam columns.");
    if (fileInput.current) fileInput.current.value = "";
  };

  const exportCsv = () => {
    const rows = ["Registration Number,Student Name,Access Number,Coursework,Exam,Final Score", ...students.map((student) => {
      const cw = entry.currentScore(student.studentId, "coursework");
      const exam = entry.currentScore(student.studentId, "exam");
      return [student.studentRegNumber, student.studentName, student.studentAccessNumber, cw, exam, cw + exam]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",");
    })];
    const href = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${course?.code ?? "course"}-${gradebook.period.name}-marks.csv`;
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return <div className="w-full space-y-4 p-4 lg:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button asChild variant="ghost" size="sm" className="gap-2 px-2">
        <Link href="/courses"><ArrowLeft className="size-4" /> Back to Course Units</Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} />
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()} disabled={isLocked} className="gap-2"><FileUp className="size-4" /> Upload Marks</Button>
        <Button variant="outline" size="sm" onClick={exportCsv} className="gap-2"><Download className="size-4" /> Export</Button>
        <Button variant="outline" size="sm" onClick={() => void entry.save()} disabled={!dirty || saving || isLocked} className="gap-2"><Save className="size-4" /> {saving ? "Saving…" : "Save Draft"}</Button>
        <Button size="sm" onClick={() => setConfirmSubmit(true)} disabled={!students.length || isLocked || submitting} className="gap-2"><Send className="size-4" /> Submit to HOD</Button>
      </div>
    </div>

    <section className="rounded-sm bg-gradient-to-r from-primary to-primary/80 px-5 py-4 text-primary-foreground">
      <h1 className="text-lg font-semibold">{gradebook.course.title} ({gradebook.course.code})</h1>
      <p className="mt-1 text-sm text-primary-foreground/80">{gradebook.period.name} · {gradebook.period.year}</p>
    </section>

    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><SlidersHorizontal className="size-3.5" /> CW Avg: {entry.average("coursework")}</Badge>
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><SlidersHorizontal className="size-3.5" /> EX Avg: {entry.average("exam")}</Badge>
      <Badge variant="secondary" className="gap-1.5 px-3 py-1.5"><Check className="size-3.5" /> Final Avg: {entry.averageFinal}</Badge>
      <Badge variant="outline" className="gap-1.5 px-3 py-1.5 capitalize"><Clock3 className="size-3.5" /> {gradebook.overallStatus}</Badge>
      {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      {gradebook.returnReason && <span className="text-sm text-destructive">Returned: {gradebook.returnReason}</span>}
    </div>

    <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((item) => <Button key={item.key} size="sm" variant={filter === item.key ? "secondary" : "ghost"} onClick={() => setFilter(item.key)} className="h-8 rounded-sm gap-1.5">
          {item.title}<span className="text-xs text-muted-foreground">{countFor(item.key)}</span>
        </Button>)}
        <Button variant="ghost" size="sm" onClick={entry.toggleSort} className="ml-auto h-8 gap-1.5 rounded-sm"><ArrowUpDown className="size-3.5" /> Sort</Button>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, access number, or registration number" className="h-10 pl-9" />
      </div>
    </div>

    <ClassResultsTable entry={entry} />
    <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Submit these marks for review?</AlertDialogTitle>
          <AlertDialogDescription>Submitting {students.length} student marks will lock this gradebook while the Head of Department reviews it.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={submitting} onClick={(event) => { event.preventDefault(); void entry.submit().then(() => setConfirmSubmit(false)); }}><Send className="mr-2 size-4" /> Submit marks</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}
